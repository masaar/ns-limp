import { Observable } from 'tns-core-modules/data/observable';

export class Common extends Observable {

  constructor() {
    super();
  }

  public greet() {
    return "Hello, NS";
  }
}

export class Utils {
 
}
