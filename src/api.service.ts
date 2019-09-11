import { Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { webSocket } from 'rxjs/webSocket';
require('nativescript-websockets');
import { CacheService } from './cache.service';
import * as app from 'tns-core-modules/platform/platform';
import { retry } from 'rxjs/operators';
import { File } from 'tns-core-modules/file-system';

import * as rs from 'jsrsasign';

const JWS = rs.jws.JWS;

export interface QueryStep {
	$search?: string;
	$sort?: {
		[attr: string]: 1 | -1;
	};
	$skip?: number;
	$limit?: number;
	$extn?: false | Array<string>;
	$attrs?: Array<string>;
	$group?: Array<{
		by: string;
		count: number;
	}>;
	[attr: string]: {
		$not: any;
	} | {
		$eq: any;
	} | {
		$gt: number | string;
	} | {
		$gte: number | string;
	} | {
		$lt: number | string;
	} | {
		$lte: number | string;
	} | {
		$bet: [number, number] | [string, string];
	} | {
		$all: Array<any>;
	} | {
		$in: Array<any>;
	} | {
		$attrs: Array<string>;
	} | {
		$skip: false | Array<string>;
	} | Query | string | { [attr: string]: 1 | -1; } | number | false | Array<string>;
}

export interface Query extends Array<QueryStep> { }

export interface callArgs {
	call_id?: string;
	endpoint?: string;
	sid?: string;
	token?: string;
	query?: Query;
	doc?: {
		[attr: string]: any;
	};
}

export interface Res<T> {
	args: {
		call_id: string;
		watch?: string;
		// [DOC] Succeful call attrs
		docs?: Array<T>;
		count?: number;
		total?: number;
		groups?: any;
		session?: Session;
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

export interface Session extends Doc {
	user: User;
	host_add: string;
	user_agent: string;
	timestamp: string;
	expiry: string;
	token: string;
}

export interface User extends Doc {
	username: string;
	email: string;
	phone: string;
	name: { [key: string]: string };
	bio: { [key: string]: string };
	address: { [key: string]: string };
	postal_code: string;
	website: string;
	locale: string;
	create_time: string;
	login_time: string;
	groups: Array<string>,
	privileges: { [key: string]: Array<string>; },
	username_hash?: string;
	email_hash?: string;
	phone_hash?: string;
	status: 'active' | 'banned' | 'deleted' | 'disabled_password',
	attrs: {
		[key: string]: any;
	}
}
export interface InitedStatus {
	INITED: 'INITED';
	NOT_INITED: 'NOT_INITED';
	FINISHED: 'FINISHED'
}

@Injectable({
	providedIn: 'root'
})
export class ApiService {

	debug: boolean = true;
	fileChunkSize: number = 500 * 1024;
	authHashLevel: 5.0 | 5.6 = 5.6;

	subject!: Subject<any>;
	skipForceRetry: boolean = false;

	api!: string;
	anon_token: string;

	session!: Session;

	inited: InitedStatus['INITED'] | InitedStatus['NOT_INITED'] | InitedStatus['FINISHED'] = 'NOT_INITED';
	inited$: Subject<InitedStatus['INITED'] | InitedStatus['NOT_INITED'] | InitedStatus['FINISHED']> = new Subject();

	authed: boolean = false;
	authed$: Subject<Session> = new Subject();

	constructor(private cache: CacheService) { }

	consoleResult(...res: any) {
		if (this.debug) console.log(...res);
		else return;
	}
	init(api: string, anonToken: string, retryCount: number = 10, forceRetry: boolean = true): Observable<any> {
		this.consoleResult('Resetting SDK before init');
		this.reset();

		this.api = api;
		// this.anon_token = anon_token;
		this.subject = webSocket(this.api);


		this.subject.pipe(retry(retryCount))
			.subscribe((res: Res<Doc>) => {
				this.consoleResult('received new message', res);
				if (res.args && res.args.code == 'CORE_CONN_READY') {
					this.reset(true);
					this.anon_token = anonToken;
					this.call('conn/verify', {}).subscribe();
				} else if (res.args && res.args.code == 'CORE_CONN_OK') {
					this.inited = 'INITED';
					this.inited$.next('INITED');
				} else if (res.args && res.args.code == 'CORE_CONN_CLOSED') {
					this.reset();
				} else if (res.args && res.args.session) {

					this.consoleResult('Response has session obj');
					if (res.args.session._id == 'f00000000000000000000012') {
						if (this.authed) {
							this.authed = false;
							this.session = null;
							this.authed$.next(null);
						}
						this.cache.remove('token');
						this.cache.remove('sid');
						this.consoleResult('Session is null');
					} else {
						this.cache.put('sid', res.args.session._id);
						this.cache.put('token', res.args.session.token);
						this.authed = true;
						this.session = res.args.session;
						this.authed$.next(this.session);
						this.consoleResult('Session updated');
					}
				}
			},
				(err: Res<Doc>) => {
					this.consoleResult('Received error : ', err);
					this.reset(false, 'FINISHED');
				},
				() => {
					this.consoleResult('Connection clean-closed');

					this.reset(false, 'FINISHED');

					if (!this.skipForceRetry && forceRetry) {

						if (retryCount-- < 1) {

							this.consoleResult('Skipped re-init connection after clean-close due to out-of-count retryCount.');

						} else {

							this.consoleResult('Re-init connection after clean-close due to forceRetry.');

							this.init(api, anonToken, retryCount--, forceRetry);

						}

					}
				}
			);

		this.skipForceRetry = false;
		return this.subject;

	}
	///// not use this close methed.....//////
	close(): Observable<Res<Doc>> {
		return this.call('conn/close', {});
	}
	reset(skipSubject: boolean = false, initedStatus: InitedStatus['NOT_INITED'] | InitedStatus['FINISHED'] = 'NOT_INITED'): void {

		try {
			this.authed = false;
			if (this.session) {
				this.session = null;
				this.authed = false;
				this.authed$.next(null);
			}

			if (this.inited) {
				this.inited = initedStatus;
				this.inited$.next(initedStatus);
			}

			if (!skipSubject) {
				this.skipForceRetry = true;
				this.subject.complete();
				this.subject.unsubscribe();
			}
		} catch { }
	}

	call(endpoint: string, callArgs: callArgs, binary: boolean = false): Observable<any> {
		callArgs.sid = (this.authed) ? callArgs.sid || this.cache.get('sid') || 'f00000000000000000000012' : 'f00000000000000000000012';
		callArgs.token = (this.authed) ? callArgs.token || this.cache.get('token') || this.anon_token : this.anon_token;
		callArgs.query = callArgs.query || [];
		callArgs.doc = callArgs.doc || {};

		callArgs.endpoint = endpoint;
		callArgs.call_id = Math.random().toString(36).substring(7);

		this.consoleResult('callArgs', callArgs);

		let filesProcess = [];

		for (let attr of Object.keys(callArgs.doc)) {
			if (callArgs.doc[attr] instanceof Array && callArgs.doc[attr].length && callArgs.doc[attr][0] instanceof File) {
				this.consoleResult('attribute', attr);
				this.consoleResult(callArgs.doc[attr]);
				for (let i of Object.keys(callArgs.doc[attr])) {
					filesProcess.push(`${attr}.${i}`);
					let binary = callArgs.doc[attr][i].readSync();

					let byteArray;
					if (app.isAndroid) {
						byteArray = new Uint8Array(binary);
					} else {
						let arr = new ArrayBuffer(binary.length);
						binary.getBytes(arr);
						byteArray = new Uint8Array(arr);
					}

					this.consoleResult(i, byteArray);

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
				this.subject.subscribe(
					(res: Res<Doc>) => {
						this.consoleResult('message received from observer on callId:', res, callArgs.call_id);
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
							

							if (!res.args.watch) {
                                this.consoleResult('completing the observer. with callId:', res.args.call_id);
								observer.complete();
								observer.unsubscribe();
								// observable.unsubscribe();
							}
						}
					}, (err: Res<Doc>) => {
						if (err.args && err.args.call_id == callArgs.call_id) {
							observer.error(err);
						}
					}, () => {
						// observer.complete();
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
				let oHeader = { alg: 'HS256', typ: 'JWT' };
				// Payload
				let tNow = Math.round((new Date() as any) / 1000);
				let tEnd = Math.round((new Date() as any) / 1000) + 86400;
				let sHeader = JSON.stringify(oHeader);
				let sPayload = JSON.stringify({ ...callArgs, iat: tNow, exp: tEnd });
				this.consoleResult(sHeader, sPayload, callArgs.token);
				let sJWT = JWS.sign('HS256', sHeader, sPayload, { utf8: callArgs.token });
				this.consoleResult('sending request as JWT token:', callArgs, callArgs.token);
				this.subject.next({ token: sJWT, call_id: callArgs.call_id });

			}
		}, 100);
	}

	generateAuthHash(authVar: 'username' | 'email' | 'phone', authVal: string, password: string): string {
		let oHeader = { alg: 'HS256', typ: 'JWT' };
		let sHeader = JSON.stringify(oHeader);
		let hashObj = [authVar, authVal, password];
		if (this.authHashLevel == 5.6) {
			hashObj.push(this.anon_token);
		}
		let sPayload = JSON.stringify({ hash: hashObj });
		let sJWT = JWS.sign('HS256', sHeader, sPayload, { utf8: password });
		return sJWT.split('.')[1];
	}

	auth(authVar: 'username' | 'email' | 'phone', authVal: string, password: string): Observable<any> {
		let doc: any = { hash: this.generateAuthHash(authVar, authVal, password) };
		doc[authVar] = authVal;
		let call = this.call('session/auth', { doc: doc });
		call.subscribe();
		return call;
	}

	reauth(sid: string = this.cache.get('sid'), token: string = this.cache.get('token')): Observable<Res<Doc>> {
		let oHeader = { alg: 'HS256', typ: 'JWT' };
		let sHeader = JSON.stringify(oHeader);
		let sPayload = JSON.stringify({ token: token });
		let sJWT = JWS.sign('HS256', sHeader, sPayload, { utf8: token });
		let call: Observable<Res<Doc>> = this.call('session/reauth', {
			sid: 'f00000000000000000000012',
			token: this.anon_token,
			query: [
				{ _id: sid || 'f00000000000000000000012', hash: sJWT.split('.')[1] }
			]
		});

		call.subscribe((res: Res<Session>) => { }, (err: Res<Session>) => {
			this.cache.remove('token');
			this.cache.remove('sid');
			if (this.authed) {
				this.authed = false;
				this.session = null;
				this.authed$.next(null);
			}
			this.consoleResult('reauthantication error ....');
		});
		return call;
	}

	signout(): Observable<Res<Doc>> {
		let call = this.call('session/signout', {
			query: [
				{ _id: this.cache.get('sid') }
			]
		});
		call.subscribe();
		return call;
	}

	checkAuth(): Observable<Res<Doc>> {
		this.consoleResult('attempting checkAuth');

		if (!this.cache.get('token') || !this.cache.get('sid')) throw new Error('No credentials cached.');
		let call = this.reauth(this.cache.get('sid'), this.cache.get('token'));
		return call;

	}
}