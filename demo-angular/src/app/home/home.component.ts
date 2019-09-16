import { Component, OnInit, ChangeDetectorRef, OnDestroy } from "@angular/core";
import { ApiService, Res, Doc } from 'ns-limp/api.service';
import { ImageSource } from "tns-core-modules/image-source";
import {  File } from "tns-core-modules/file-system";
import { Page } from "tns-core-modules/ui/page/page";
import * as dialogs from "tns-core-modules/ui/dialogs";
import { Mediafilepicker, ImagePickerOptions } from 'nativescript-mediafilepicker';
import * as app from 'tns-core-modules/application';


@Component({
    selector: "Home",
    moduleId: module.id,
    templateUrl: "./home.component.html"
})
export class HomeComponent implements OnInit, OnDestroy {
    serverIp: string = 'ws://localhost:8081/ws';
    token: string = '__ANON';
    conn_status : 'connected' | 'connecting' | 'not connected' = 'not connected';

    userType: 'username' | 'email' | 'phone' = 'email';
    userName: string ;
    password: string ;

    endPoint: string = '';
    query: string ;
    doc: string ;

    isDestory : boolean = false;

    results: Array<any> = [];

    layout: 'log' | 'query' = 'query';

    mediafilepicker = new Mediafilepicker();
    imageFile: Array<File> = [];

    connectionOpen : boolean = true;

    constructor(page: Page, private api: ApiService, private cdr: ChangeDetectorRef) {
        // Use the component constructor to inject providers.
        page.actionBarHidden = true;
    }

    ngOnInit(): void {
        this.api.debug = true;
        this.api.inited$.subscribe(
            (init) => {
                if (init) {
                    console.log('connection successful initiated....');
                    this.results.push('connection successful initiated....');
                    this.results.push('call check auth methed...');
                    this.conn_status = 'connected';
                    this. changeDetection();
                    // this.initilized = true;
                    // this.userCheckAuth();
                    try {
                        this.api.checkAuth().subscribe(
                            (res) => {
                                console.log('check authed successful ');
                                this.results.push( (res));
                                this. changeDetection();
                            }, (err) => {
                                console.log('user not authorized...', err);
                                this.results.push( (err));
                                this. changeDetection();
                            }
                        )
                    } catch (err) {
                        console.log('check auth error: ', err);
                        this.results.push( (err));
                        this. changeDetection();
                    }
                }
                else {
                    console.log('connection failed and retrying....');
                    this.results.push('connection failed and retrying....');
                    // this.initilized = false;
                    this.conn_status = 'not connected';
                    this. changeDetection();
                    setTimeout(() => {
                        if(this.connectionOpen) this.init();
                    }, 2000);
                }

            }, (err) => {
                console.log('inited error: ', err);
                this.results.push('inited error: ', err);
                this.conn_status = 'not connected';
                this. changeDetection();
                // this.initilized = false;
            }
        );
        this.api.authed$.subscribe((session: Doc) => {
            console.log('authed$.session', session);
            this.results.push(session);
            if (session) {
                this. changeDetection();
            } else {
                this. changeDetection();
            }
        });

        this. filepickerinit();
        // this.init();
    }

    ngOnDestroy(){
        this.isDestory = true;
        this.connectionOpen = false;
        this.closeConn();
    }

    filepickerinit(){
        this.mediafilepicker.on("getFiles", (res) => {
            let results = res.object.get('results');
            this.results.push(results);
            if (results) {
                for (let i = 0; i < results.length; i++) {
                    console.log(results);
                   
                    let result = results[i];

                    let fileaddress: string = result.file;
                    let fileExtension: string = fileaddress.split('.').pop().toLowerCase();
                    if ( fileExtension == 'png' ||fileExtension == 'jpeg' ||fileExtension == 'jpg' ||fileExtension == 'png')
                        {
                        if (result.file && app.ios ) {

                            let file = result.file;
                            let fileName = file.replace(/^.*[\/]/, '');
    
                            this.mediafilepicker.copyPHImageToAppDirectory(result.rawData, fileName).then((res: any) => {
                                let fileExt: string =  result.file.split('.').pop().toLowerCase();
                                // console.log('file directory', res, fileName);
                                let imgfile: File = File.fromPath(res.file);
                                // console.log('file is:', imgfile.name);
                                
                                (imgfile as any).type = 'image/' + fileExt;
                                // console.log('image file ', imgfile);
                                this.imageFile.push(imgfile);
    
                            }).catch((e) => {
                                console.dir('err', e);
                                this.results.push('err',  e);
                            });                         
                           
                        } else if (result.file && app.android) {
                            let fileExt: string =  result.file.split('.').pop().toLowerCase();
                            
                            let file: File = File.fromPath(result.file);
                            (file as any).type = 'image/' + fileExt;
                            this.imageFile.push(file);
                            let imagesrc = new ImageSource();
                            imagesrc = result.file;
                        }
                    }

                }
            }
            if(app.android) this.changeDetection();
        });
   

        this.mediafilepicker.on("error", (res) => {
            let msg = res.object.get('msg');
            console.log(msg);
            this.results.push(msg);
        });

        this.mediafilepicker.on("cancel", (res) => {
            let msg = res.object.get('msg');
            console.log(msg);
            this.results.push(msg);
        });
    }
    selectImage() {
        this.imageFile  = [];
        let options: ImagePickerOptions = {
            android: {
                isCaptureMood: false, // if true then camera will open directly.
                isNeedCamera: false,
                maxNumberFiles: 10,
                isNeedFolderList: true
            }, ios: {
                isCaptureMood: false, // if true then camera will open directly.
                maxNumberFiles: 10
            }
        };
              
            this.mediafilepicker.openImagePicker(options); 
        
    }
    init(): void {
        this.conn_status = 'connecting';
        this.connectionOpen = true;
        this.api.init(this.serverIp, this.token);
    }

    changeDetection(){
        if(this.isDestory) return;
        else this.cdr.detectChanges();
    }
    auth(): void {
        this.api.auth(this.userType, this.userName, this.password).subscribe(
            (res)=>{
                this.results.push( res);
                this.changeDetection();
            },(err)=>{
                this.results.push( err);
                this.changeDetection();
            }
        );
        //.subscribe((res) => { alert('Authed succefully!') });
    }

    authType() {

        dialogs.action("Select User Type", "Cancel", ['username' , 'email' , 'phone']).then(result => {
            console.log("Dialog result: " + result);
            if (result == "username") {
                //Do action1
                this.userType = 'username';
            } else if (result == "email") {
                this.userType = 'email';
                //Do action2
            } else if (result == "phone") {
                this.userType = 'phone';
                //Do action2
            }
        });

    }
    signout(): void {
        this.api.signout().subscribe(
            (res) => {
                this.results.push( (res));
                this. changeDetection();
            }, (err) => {
                this.results.push( (err));
                this. changeDetection();
            }
        );
        //.subscribe((res) => { alert('Singed-out succefully!') });
    }

    call(){
        this.results.push(this.endPoint, this.query, this.doc);
        console.log( this.endPoint, JSON.parse( this.query), this.doc);
        this.api.call(this.endPoint,{
            query: JSON.parse(this.query),
            doc: JSON.parse(this.doc)
        }).subscribe(
            (res)=>{
                console.log(res);
                this.results.push(res);
                this.changeDetection();
            },(err)=>{
                console.log(err);
                this.results.push(err);
                this.changeDetection();
            }
        );
    }
    submit(): void {
        this.api.call('staff/create', {
            doc: {
                name: {
                    ar_AE: 'staff ar',
                    en_AE: 'staff en'
                },
                bio: {
                    ar_AE: 'bio ar',
                    en_AE: 'bio en'
                },
                jobtitle: {
                    ar_AE: 'jobtitle ar',
                    en_AE: 'jobtitle en'
                },
                photo: document.querySelector('input').files,
            }
        }, true).subscribe((res: Res<Doc>) => {
            console.log('submit.res', res);
            this.results.push( (res));
            this. changeDetection();
        }, (err: Res<Doc>) => {
            this.results.push( (err));
            console.log('submit.err', err);
            this. changeDetection();
        });
    }

    createblogcat(): void {
        this.api.call('blog_cat/create', {
            doc: {
                title: {
                    ar_AE: 'staff ar',
                    en_AE: 'staff en'
                },
                desc: {
                    ar_AE: 'staff ar',
                    en_AE: 'staff en'
                }
            }
        }, true).subscribe((res: Res<Doc>) => {
            console.log('createblogcat.res', res);
            this.results.push( (res));
            this. changeDetection();
        }, (err: Res<Doc>) => {
            this.results.push( (err));
            this. changeDetection();
            console.log('createblogcat.err', err);
        });
    }

    fileUpload() {
        let docs = {
            file: this.imageFile
        };
        this.results.push('file uploading process....');
        if(this.imageFile.length)
        this.api.call( 'file/upload',{
            doc: docs
        },true).subscribe(
            (res)=>{
                console.log(res);
                this.results.push(res);
                this.changeDetection();
            },(err)=>{
                console.log(err);
                this.results.push(err);
                this.changeDetection();
            }
        );
        else this.results.push('there no file select to upload....');
        this.changeDetection();
    }
    clear() {
        this.results = [];
    }
    closeConn(){
        this.conn_status = 'not connected';
        this.connectionOpen = false;
        this.results.push('make connection close request');
        this.api.close().subscribe(
            (res)=>{
                this.results.push( (res));
                this. changeDetection();
            }, (err)=>{
                this.results.push( (err));
                this. changeDetection();
            }
        );
        this. changeDetection();
    }
}
