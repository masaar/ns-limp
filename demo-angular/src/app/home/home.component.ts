import { Component, OnInit } from "@angular/core";
import { take } from 'rxjs/operators';
import { ApiService, Res, Doc } from 'ns-limp/api.service';

@Component({
    selector: "Home",
    moduleId: module.id,
    templateUrl: "./home.component.html"
})
export class HomeComponent implements OnInit {

    constructor(private api:ApiService) {
        // Use the component constructor to inject providers.

    }

    ngOnInit(): void {
        // Init your component properties here.
        this.api.init('ws://api-dev.skiltii.com/ws','__ANON_TOKEN_f00000000000000000000012').pipe(
            take(1)
        ).subscribe((res: Res<Doc>) => {
            // this.initilized = true;
            console.log('api initilzed successfully......');
            // this.api.authed$.subscribe((session: any) => {
            //     if (session) {
            //         // console.log('session:', session);
            //         this.cache.setboolean('authed', true);
            //         // this.sql.addToSession(session).subscribe(
            //         //     res=>{
            //         //         console.log(res);
            //         //     },err=>{
            //         //         console.log(err);
            //         //     }
            //         // );
                    
            //     }
            // });
        }, (err) =>{
            console.log(err);
            // this.initilized = false;
        });
    }
}
