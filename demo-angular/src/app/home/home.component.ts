import { Component, OnInit, ChangeDetectorRef } from "@angular/core";
import { take } from 'rxjs/operators';
import { ApiService, Res, Doc } from 'ns-limp/api.service';

@Component({
    selector: "Home",
    moduleId: module.id,
    templateUrl: "./home.component.html"
})
export class HomeComponent implements OnInit {

    msg: string;
    result: string;
    constructor( 
        private api:ApiService, private cdr: ChangeDetectorRef) {
        // Use the component constructor to inject providers.
    }

    ngOnInit(): void {
        // Init your component properties here.
        this.api.init('ws://localhost:8081/ws','__ANON_TOKEN').pipe(
            take(1)
        ).subscribe((res: Res<Doc>) => {
        //     // this.initilized = true;
            console.log('api initilzed successfully......');
            this.msg = 'api initilzed successfully......';

            
        }, (err) =>{
            console.log(err);
            // this.initilized = false;
        });
    }
    login(){
       
    }

}
