import { Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { webSocket } from 'rxjs/webSocket';
require('nativescript-websockets');
import { CacheService } from './cache.service';

import { File } from 'tns-core-modules/file-system';

import * as rs from 'jsrsasign';

const JWS = rs.jws.JWS;

export interface queryStep {

	[attr: number]: queryStep | {

		$search?: string;

		$sort?: { [attr: string]: 1 | -1 };

		$skip?: number;

		$limit?: number;

		$extn?: false | Array<string>;

		$attrs?: Array<string>;

		$group: Array<{ by: string; count: number; }>;

		[attr: string]: { $not: any } | { $eq: any } | { $gt: number } | { $gte: number } | { $lt: number } | { $lte: number } | { $bet: [number, number] } | { $all: Array<any> } | { $in: Array<any> } | { $attrs: Array<string>; } | { $skip: false | Array<string>; } | queryStep | any;

	}

}
export interface callArgs {
	call_id?: string;
	endpoint?: string;
	sid?: string;
	token?: string;
	query?: any;
	doc?: any;
}

export interface Res<T> {
	args: {
		call_id: string;
		// [DOC] Succeful call attrs
		docs?: Array<T>;
		count?: number;
		total?: number;
		groups?: any;
		// [DOC] Failed call attrs
		code?: string;
	}
	msg: string;
	status: number;
}

export interface Doc {
	_id: string;
	[key: string]: any;
}

@Injectable({
	providedIn: 'root'
})
export class ApiService {
	subject!: Subject<any>;
    anon_token: string= '__ANON_TOKEN_f00000000000000000000012';
    apiURL: string;
    session!: any;
    fileChunkSize: number = 500 * 1024;

    debug: boolean = false;

	authed: boolean = false;
	authed$: Subject<boolean> = new Subject();

	constructor(private cache: CacheService) { }

    consoleResult(...res:any){
        if(this.debug) console.log(...res);
        else return;
    }
	init(API_URL: string, anon_token): Observable<any> {
        this.apiURL = API_URL;
        this.anon_token = anon_token;
		this.subject = webSocket(API_URL);
		let init = new Observable(
			(observer) => {
				this.subject.subscribe(
					(msg: Res<Doc>) => {
						observer.next(msg);
					},
					(err: Res<Doc>) => {
						observer.error(err);
					},
					() => {
						this.reconnect();
					}
				);
			}
		);
		return init;
	}

	reconnect(): void {
	}

	call(endpoint: string, callArgs: callArgs, binary: boolean = false): Observable<any> {
		callArgs.sid = (this.authed) ? callArgs.sid || this.cache.get('sid') || 'f00000000000000000000012' : 'f00000000000000000000012';
		callArgs.token = (this.authed) ? callArgs.token || this.cache.get('token') || this.anon_token : this.anon_token;
		callArgs.query = callArgs.query || {};
		callArgs.doc = callArgs.doc || {};

		callArgs.endpoint = endpoint;
		callArgs.call_id = Math.random().toString(36).substring(7);

		// this.consoleResult('callArgs', callArgs);
		// this.consoleResult('sJWT', sJWT);

		let filesProcess = [];

		for (let attr of Object.keys(callArgs.doc)) {
			if (callArgs.doc[attr] instanceof Array && callArgs.doc[attr].length && callArgs.doc[attr][0] instanceof File) {
                this.consoleResult('attribute', attr );
				this.consoleResult(callArgs.doc[attr]);
				for (let i of Object.keys(callArgs.doc[attr]) ){
                    filesProcess.push(`${attr}.${i}`);
					let binary = callArgs.doc[attr][i].readSync();
                    let byteArray = new Uint8Array(binary);
                    this.consoleResult(i,byteArray);
                    
                    let byteArrayIndex: number = 0;

						let chunkIndex: number = 1;

						// let chunksize: number = 500 * 1024;

						while (byteArrayIndex < byteArray.length) {
							this.consoleResult('attempting to send chunk of 500kb from:', byteArrayIndex, chunkIndex);
							this.call('file/upload', {
								doc: {
									attr: attr,
									index: i,
									chunk: chunkIndex,
									total: Math.ceil(byteArray.length / this.fileChunkSize),
									file: {
										name: callArgs.doc[attr][i].name,
										size: callArgs.doc[attr][i].size,
										type: callArgs.doc[attr][i].type,
										lastModified: callArgs.doc[attr][i].lastModified,
										content: byteArray.slice(byteArrayIndex, byteArrayIndex + this.fileChunkSize).join(',')
									}
								}
							}).subscribe((res) => {
                                this.consoleResult('file upload', res);
								filesProcess.splice(filesProcess.indexOf(`${attr}.${i}`), 1);

							});

							byteArrayIndex += this.fileChunkSize;

							chunkIndex += 1;

                        }
				}
			}
		}
		this.pushCall(callArgs, filesProcess);

		let call = new Observable(
			(observer) => {
				this.subject
					.subscribe(
						(res: Res<Doc>) => {
							// this.consoleResult('message received', res);
							if (res.status == 291) {
								// [TODO] Create files handling sequence.
								return;
							}
							if (res.args && res.args.call_id == callArgs.call_id) {
								if (res.status == 200) {
									observer.next(res);
								} else {
									observer.error(res);
								}
							}
						}, (err: Res<Doc>) => {
							if (err.args && err.args.call_id == callArgs.call_id) {
								observer.error(err);
							}
							// if (err._body.args.code == 'CORE_SESSION_INVALID_SESSION') {
							// 	this.cache.remove('token');
							// 	this.cache.remove('sid');
							// }
						}, () => {
							observer.complete();
						}
					);
			}
		);
		return call;
	}

	pushCall(callArgs: any, filesProcess: Array<string>): void {
		setTimeout(() => {
			this.consoleResult('checking filesProcess...');
			if (filesProcess.length) {
				this.pushCall(callArgs, filesProcess);
			} else {
				// this.consoleResult('about to push call to subject', this.subject);
				// if (callArgs.token == environment.anon_token) {
				// 	this.subject.next(callArgs);
				// } else {
					// Header
					let oHeader = { alg: 'HS256', typ: 'JWT' };
					// Payload
					let tNow = Math.round((new Date() as any) / 1000);
					let tEnd = Math.round((new Date() as any) / 1000) + 86400;
					let sHeader = JSON.stringify(oHeader);
					let sPayload = JSON.stringify({ ...callArgs, iat: tNow, exp: tEnd });
					// this.consoleResult(sHeader, sPayload, callArgs.token);
					let sJWT = JWS.sign('HS256', sHeader, sPayload, { utf8: callArgs.token });
					// this.consoleResult('sending request as JWT token:', callArgs, callArgs.token);
					this.subject.next({ token: sJWT });
				// }
			}
		}, 100);
	}

	generateAuthHash(authVar: 'username' | 'email' | 'phone', authVal: string, password: string): string {
		let oHeader = { alg: 'HS256', typ: 'JWT' };
		let sHeader = JSON.stringify(oHeader);
		let sPayload = JSON.stringify({hash:[authVar, authVal, password]});
		let sJWT = JWS.sign('HS256', sHeader, sPayload, { utf8: password });
		return sJWT.split('.')[1];
	}

	auth(authVar: 'username' | 'email' | 'phone', authVal: string, password: string): Observable<any> {
		let doc: any = { hash: this.generateAuthHash(authVar, authVal, password) };
		doc[authVar] = authVal;
		let call = new Observable(
			(observer) => {
				this.authed = false;
				this.session = undefined;
				this.authed$.next(this.session);

				this.cache.remove('token');
				this.cache.remove('sid');
				this.call('session/auth', {
					doc: doc
				}).subscribe((res) => {
					this.cache.put('sid', res.args.docs[0]._id);
					this.cache.put('token', res.args.docs[0].token);

					this.authed = true;
					this.session = res.args.docs[0];
					this.authed$.next(this.session);

					observer.next(res);
				}, (err) => {
					observer.error(err);
				}, () => {
					observer.complete();
				});
			}
		);
		return call;
	}

	reauth(sid: string = this.cache.get('sid'), token: string = this.cache.get('token')): Observable<any> {
		let oHeader = { alg: 'HS256', typ: 'JWT' };
		let sHeader = JSON.stringify(oHeader);
		let sPayload = JSON.stringify({ token: token });
		let sJWT = JWS.sign('HS256', sHeader, sPayload, { utf8: token });
		return this.call('session/reauth', {
			sid: 'f00000000000000000000012',
			token: this.anon_token,
            // query: { _id: { val: sid || 'f00000000000000000000012' }, hash: { val: sJWT.split('.')[1] } }
            query: [

				{ _id: sid || 'f00000000000000000000012', hash: sJWT.split('.')[1] }

			]
		});
	}

	signout(): Observable<any> {
		let call = new Observable(
			(observer) => {
				this.call('session/signout', {
                    // query: { _id: { val: this.cache.get('sid') } }
                    query: [{ _id: this.cache.get('sid') }]
				}).subscribe((res) => {
					this.authed = false;
					this.session = undefined;
					this.authed$.next(this.session);

					this.cache.remove('token');
					this.cache.remove('sid');


					observer.next(true);
				}, (err) => {
					observer.error(err);
					
				});

			}
		);
		return call;
	}

	checkAuth(): Observable<any> {
		// this.consoleResult('attempting checkAuth');
		let check = new Observable(
			(observer) => {
				if (!this.cache.get('token') || !this.cache.get('sid')) observer.error(new Error('No credentials cached.'));
				this.reauth(this.cache.get('sid'), this.cache.get('token')).subscribe(
					(res) => {
						this.authed = true;
						this.session = res.args.docs[0];
						this.authed$.next(this.session);

						observer.next(res);
					},
					(err) => {
						this.cache.remove('token');
						this.cache.remove('sid');

						this.authed = false;
						this.session = undefined;
						this.authed$.next(this.session);

						observer.error({
							status: 403,
							message: 'Wrong credentials cached.'
						})
					},
					() => observer.complete()
				);
			}
		);
		return check;
	}
}