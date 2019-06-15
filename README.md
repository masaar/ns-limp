# `ng-limp`
Official NativeScript Angular SDK for [LIMP](https://github.com/masaar/limp).

# Quick Start
The current SDK has two dependencies:
* `jsrasgin`
* `nativescript-websockets`
The dependencies should be automatically installed with the library.

## Install ng-limp
```bash
npm i --save ng-limp
```

## How to Use
1. Initiate the API, in your component, using :
```typescript

import { Component, OnInit } from '@angular/core';

import { ApiService, Res, Doc } from 'nativescript-ns-limp/api.service';

@Component({
	selector: 'app-root',
	templateUrl: './app.component.html',
	styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {

	constructor(private api: ApiService) {}

	ngOnInit() {
		this.api.init('ws://localhost:8081/ws', 'http://localhost:8081', '__ANON').subscribe((res: Res<Doc>) => {
			console.log('res', res);
		}, (err: Res<Doc>) => {
			console.log('err', err);
		});
	}
}
```

## Setting Global Variables
There are two variables that you can set before initiating the SDK:
1. `debug`: A `Boolean` representing the debug mode status on the SDK. If `true`, you would see verbose messages in the browser console about messages transferred are received. Default `false`.
2. `fileChunkSize`: A `Number` representing the chunk size in bytes of the files being uploaded as part of the process of pushing binary data to LIMP app. Default `512000`.

# Best Practices
You can use the SDK 100% per your style of development, however we have some tips:

## Session Reauth
The best practice to handle a `reauth` scenario is by attempting to `checkAuth` as soon as the connection with LIMP app is made. This can be detected by checking for messages received on the `api.init` subscription and wait for the following message:
```json
{
	"status": 200,
	"msg": "Connection establised",
	"args":{ "code": "CORE_CONN_OK" }
}
```
Which can be done like:
```typescript
this.api.init('ws://localhost:8081/ws', 'http://localhost:8081', '__ANON')
.pipe(retry(10))
.subscribe((res: Res<Doc>) => {
	if (res.args.code == 'CORE_CONN_OK') {
		// [DOC] Connection successful. Let's check if we can `reauth` the user:
		this.api.checkAuth().subscribe((res: Res<Doc>) => {
			console.log('checkAuth.res', res);
		}, (err: Res<Doc>) => {
			console.log('checkAuth.err', err);
		});
	}
	console.log('api.res', res);
}, (err: Res<Doc>) => {
	console.log('api.err', err);
});
```

## Auth State Detection
Although, you can detect the user auth state in the subscription of the calls `auth`, `reauth` and `checkAuth`, the best practice is to use the global `authed$` state `Subject`. You can do this by subscripting to `authed$` in the same component (usually `AppComponent`) you are initiating the SDK at. This assures a successful `checkAuth` as part of the `api.init` subscription can be handled. The model suggested is:
```typescript
this.api.authed$.subscribe((session: Doc) => {
	if (session) {
		console.log('We are having an `auth` condition with session:', session);
	} else {
		console.log('We just got unauthenticated');
	}
});
```

## Reconnecting on Disconnects
Websockets are always-alive connections. A lot can go wrong here resulting in the connection with your LIMP app. To make sure you can always get reconnected You can use [`retry` operator](https://rxjs-dev.firebaseapp.com/api/operators/retry) from [`RxJS`](https://rxjs-dev.firebaseapp.com), like:
```typescript

// [DOC] Remember to import the operator like: import { retry } from 'rxjs/operators';

this.api.init('ws://localhost:8081/ws', 'http://localhost:8081', '__ANON')
	.pipe(retry(10))
	.subscribe((res: Res<Doc>) => {
		console.log('api.res', res);
	}, (err: Res<Doc>) => {
		console.log('api.err', err);
	});
```

# API Reference

## `debug`
A `Boolean` representing the debug mode status on the SDK. If `true`, you would see verbose messages in the browser console about messages transferred are received. Default `false`.

## `fileChunkSize`
A `Number` representing the chunk size in bytes of the files being uploaded as part of the process of pushing binary data to LIMP app. Default `512000`.

## `session`
A `Doc` object representing the current session. It has value only when the user is authenticated.

## `authed`
A `Boolean` storing the current state of user authentication.

## `authed$`
A `Subject<Boolean | Doc>` you can subscribe to handle changes to state of user authentication.

## `init()`
The base method to initiate a connection with LIMP app. Method definition:
```typescript
init(api: String, anon_token: String): Observable<any> { /*...*/ }
```

## `auth()`
The method you can use to authenticate the user. Method definition:
```typescript
auth(authVar: 'username' | 'email' | 'phone', authVal: string, password: string): Observable<Res<Doc>> { /*...*/ }
```

## `reauth()`
The method you can use to reauthenticate the user. The method would fail if no `sid` and `token` attrs are cached from earlier successful authentication call. This method is not supposed to be called directly, rather use [`checkAuth()`](#checkauth). Method definition:
```typescript
reauth(sid: string = this.cache.get('sid'), token: string = this.cache.get('token')): Observable<Res<Doc>> { /*...*/ }
```

## `signout()`
The method you can use to `signout` the current user. Upon success, this methods removes all the cached attrs of the session. Method definition:
```typescript
signout(): Observable<Res<Doc>> { /*...*/ }
```

## `checkAuth()`
The method to check whether there is a cached session and attempt to reauthenticate the user. Method definition:
```typescript
checkAuth(): Observable<Res<Doc>> { /*...*/ }
```

## `generateAuthHash()`
The method to use to generate authentication hashes. This is used internally for the [`auth()`](#auth) call. However, you also need this to generate the values when creating a user. Method definition:
```typescript
generateAuthHash(authVar: 'username' | 'email' | 'phone', authVal: string, password: string): string { /*...*/ }
```

## `call()`
The most important method in the SDK. This is the method you use to call different endpoints in your LIMP app. Although the `callArgs` object in the params is having full definition of all call attrs, you still usually only need to pass either `query` and/or `doc` in most of the cases. Method definition:
```typescript
call(endpoint: string, callArgs: callArgs): Observable<Res<Doc>> { /*...*/ }
```

# Contribution Guidelines
Thank you for your interest in `ng-limp`.

Please refer to [Contribution Guidelines](https://github.com/masaar/ng-limp/blob/master/CONTRIBUTING.md) for more details on contributing to this project.