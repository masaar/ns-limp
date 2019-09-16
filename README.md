# ns-limp
Official NativeScript Angular SDK for [LIMP](https://github.com/masaar/ns-limp).

# Quick Start
The current SDK has two dependencies:
* `jsrasgin`
* `nativescript-websockets`
The dependencies should be automatically installed with the library.

## Install ns-limp for NativeScript
```bash
tns plugin add ns-limp
```

## How to Use
1. Initiate the API, in your component, using :
```typescript
import { Component, OnInit } from '@angular/core';

import { ApiService, Res } from 'ns-limp/api.service';

@Component({
	selector: 'app-root',
	templateUrl: './app.component.html',
	styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {

	constructor(private api: ApiService) {}

	ngOnInit() {
		this.api.init('ws://localhost:8081/ws', '__ANON');
	}
}
```

## Setting Global Variables
There are two variables that you can set before initiating the SDK:
1. `debug`: A `Boolean` representing the debug mode status on the SDK. If `true`, you would see verbose messages in the browser console about messages transferred are received. Default `false`.
2. `fileChunkSize`: A `Number` representing the chunk size in bytes of the files being uploaded as part of the process of pushing binary data to LIMP app. Default `512000`.
3. `authHashLevel`: Either `5.0` or `5.6`. With the change to auth hash generation introduced in APIv5.6 of LIMP, some legacy apps are left without the ability to upgrade to APIv5.6 and beyond due to hashes difference. SDKv5.7 is adding `authHashLevel` to allow developers to use higher APIs and SDKs with legacy apps. Default `5.6`;

# Best Practices
You can use the SDK 100% per your style of development, however we have some tips:

## Session Reauth
The best practice to handle a `reauth` scenario is by attempting to `checkAuth` as soon as the connection with LIMP app is made. This can be made by subscribing to `inited$` subject which notifies subscriptions about any changes to SDK initialisation status reflected as `inited` attribute in the SDK. Which can be done like:
```typescript
this.api.inited$.subscribe((init: boolean) => {
	if (init) {
		// SDK is inited and ready for your calls:
		try {
			// Wrap in try..catch to handle error thrown if no credentials cached
			this.api.checkAuth();
		} catch { }
	}
}, (err: Res<Doc>) => {
	console.log('inited$.err', err);
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
Websockets are always-alive connections. A lot can go wrong here resulting in the connection with your LIMP app. To make sure you can always get reconnected recall SDK `init` method upon SDK becoming not `inited`:
```typescript
import { Component, OnInit } from '@angular/core';

import { ApiService, Res } from 'ns-limp/api.service'

@Component({
	selector: 'app-root',
	templateUrl: './app.component.html',
	styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {

	constructor(private api: ApiService) {
		this.api.inited$.subscribe((init: boolean) => {
			if (init) {
				// SDK is inited and ready for your calls:
				try {
					// Wrap in try..catch to handle error thrown if no credentials cached
					this.api.checkAuth();
				} catch { }
			} else {
				// SDK just got not inited, let's init SDK again:
				this.init();
			}
		}, (err: Res<Doc>) => {
			console.log('inited$.err', err);
		});
	}

	ngOnInit() {
		this.init();
	}

	init(): void {
		this.api.init('ws://localhost:8081/ws', 'http://localhost:8081', '__ANON');
	}
}
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
The base method to initiate a connection with LIMP app. This method returns an `Observable` for chain subscription if for any reason you need to read every message being received from the API, however subscribing to it is not required. Method definition:
```typescript
init(api: String, anon_token: String): Observable<Res<Doc>> { /*...*/ }
```

## `close()`
The method to close current connection with LIMP app. This method returns an `Observable` for chain subscription if for any reason you need to read the resposne of the `close` call, however subscribing to it is not required. Method definition:
```typescript
close(): Observable<Res<Doc>> { /*...*/ }
```

## `auth()`
The method you can use to authenticate the user. This method returns an `Observable` for chain subscription if for any reason you need to read the response of the `auth` call, however subscribing to it is not required. Method definition:
```typescript
auth(authVar: 'username' | 'email' | 'phone', authVal: string, password: string): Observable<Res<Doc>> { /*...*/ }
```

## `reauth()`
The method you can use to reauthenticate the user. The method would fail if no `sid` and `token` attrs are cached from earlier successful authentication call. This method is not supposed to be called directly, rather use [`checkAuth()`](#checkauth). This method returns an `Observable` for chain subscription if for any reason you need the response of the `reauth` call, however subscribing to it is not required. Method definition:
```typescript
reauth(sid: string = this.cache.get('sid'), token: string = this.cache.get('token')): Observable<Res<Doc>> { /*...*/ }
```

## `signout()`
The method you can use to `signout` the current user. Upon success, this methods removes all the cached attrs of the session. This method returns an `Observable` for chain subscription if for any reason you need the response of the `signout` call, however subscribing to it is not required. Method definition:
```typescript
signout(): Observable<Res<Doc>> { /*...*/ }
```

## `checkAuth()`
The method to check whether there is a cached session and attempt to reauthenticate the user. This method would throw an error if no credentials are cached, thus you need to always wrap it in `try..catch`. This method returns an `Observable` for chain subscription if for any reason you need the response of the `checkAuth` call, however subscribing to it is not required. Method definition:
```typescript
checkAuth(): Observable<Res<Doc>> { /*...*/ }
```

## `generateAuthHash()`
The method to use to generate authentication hashes. This is used internally for the [`auth()`](#auth) call. However, you also need this to generate the values when creating a user. Method definition:
```typescript
generateAuthHash(authVar: 'username' | 'email' | 'phone', authVal: string, password: string): string { /*...*/ }
```

## `deleteWatch`
The method to delete a watch in progress. You can pass the watch ID you want to delete or `__all` to delete all watches. This method returns an `Observable` for chain subscription if for any reason you need the response of the `deleteWatch` call, however subscribing to it is not required. Method definition:
```typescript
deleteWatch(watch: string | '__all'): Observable<Res<Doc>> { /*...*/ }
```

## `call()`
The most important method in the SDK. This is the method you use to call different endpoints in your LIMP app. Although the `callArgs` object in the params is having full definition of all call attrs, you still usually only need to pass either `query` and/or `doc` in most of the cases. Third param `awaitAuth` specify wheter the call should be queued until session is authed. Method definition:
```typescript
call(endpoint: string, callArgs: callArgs, awaitAuth: boolean = false): Observable<Res<Doc>> { /*...*/ }
```

# Contribution Guidelines
Thank you for your interest in `ns-limp`.

Please refer to [Contribution Guidelines](/CONTRIBUTING.md) for more details on contributing to this project.