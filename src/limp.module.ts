import { NgModule, ModuleWithProviders } from '@angular/core';



import {ApiService} from './api.service';
import { CacheService} from './cache.service';

@NgModule({

	declarations: [  ],

	exports: [  ]

})

export class limpModule {

	public static forRoot(): ModuleWithProviders {

		return {

			ngModule: limpModule,

			providers: [ 
                ApiService,
                CacheService
            ]

		};

	}

}