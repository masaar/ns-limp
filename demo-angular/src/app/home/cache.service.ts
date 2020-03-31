import { Injectable } from '@angular/core';

import * as applicationSettings from 'tns-core-modules/application-settings';

@Injectable({
	providedIn: 'root'
})
export class CacheService {

	constructor() { }

	get(key: string): string {
		return applicationSettings.getString(key);
	}
    setboolean(key:string,val: boolean){
        applicationSettings.setBoolean(key, val);
    }
    getboolean(key):boolean{
        return applicationSettings.getBoolean(key);
    }
	put(key: string, val: string): void {
		applicationSettings.setString(key, val);
	}

	remove(key: string): void {
		applicationSettings.remove(key);
	}
	removeall(): void{
		applicationSettings.clear();
	}
}