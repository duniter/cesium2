import {EventEmitter, Injectable} from "@angular/core";
import {Observable, Subject} from 'rxjs';
import {Person} from './model';
import {map, mergeMap, switchMap} from "rxjs/operators";
import {LoadResult, SortDirection, TableDataService} from "../../shared/services/data-service.class";
import {DuniterService} from "../../core/services/duniter/duniter.service";
import {Identity} from "../../core/services/duniter/duniter.model";
import {Entity} from "../../core/services/model";
import {FormFieldDefinition} from "../../shared/form/field.model";
import {environment} from "../../../environments/environment";


export class WotSearchFilter {
  search?: string;
}

export declare interface WotSearchEvent {
  searchText?: string;
  data: LoadResult<any>;
  pubkeyAttributeName?: string;
  allowMixedSearch?: boolean;
  done();
}

@Injectable()
export class WotService implements TableDataService<Person, WotSearchFilter> {

  private _debug = false;
  private _additionalFields: FormFieldDefinition[] = [];
  onWotSearch = new EventEmitter<WotSearchEvent>(true);

  constructor(
    protected duniter: DuniterService
  ) {
    this._debug = !environment.production;
  }

  /**
   * Load identities
   * @param offset 
   * @param size 
   * @param sortBy 
   * @param sortDirection 
   * @param filter 
   * @param options 
   */
  public watchAll(
    offset: number,
    size: number,
    sortBy?: string,
    sortDirection?: SortDirection,
    filter?: WotSearchFilter,
    options?: any
  ): Observable<LoadResult<Person>> {

    const additionalProperties = this._additionalFields.map(f => f.key);
    console.log("[wot-service]] Searching on wot...", filter);

    const page = {offset, size, sortBy, sortDirection};
    return this.duniter.pendingIdentities(filter && filter.search, { page })
      .pipe(
        switchMap(async(res) => {
          res = await this.extendAll(res, {
            searchText: filter && filter.search,
            pubkeyAttributeName: 'pubkey',
            skipAddUid: true
          });

          const data = res.data.map((source) => {
            const target = Person.fromObject(source);
            additionalProperties.forEach(key => target[key] = source[key]);
            return target as Person;
          });

          return {
            data,
            total: res.total
          };
        })
      );
  }

  async ready(): Promise<boolean> {
    return await this.duniter.ready();
  }

  async extend(data: any, options?: {
    pubkeyAttributeName?: string,
    skipAddUid?: boolean
  }): Promise<any>{
    if (!data) return data;
    const res = await this.extendAll({data: [data], total:1 }, options);
    return res.data[0];
  }

  async  extendAll(data: LoadResult<any>, options?: {
    searchText?: string;
    pubkeyAttributeName?: string,
    skipAddUid?: boolean
  }): Promise<LoadResult<any>> {
    options = options || {};
    options.pubkeyAttributeName = options.pubkeyAttributeName || 'pubkey';

    const observerCount = this.onWotSearch.observers.length;
    if (observerCount === 0) return data; // no observers

    // TODO: add member uids, if not skipped

    // Emit to observers, and wait all are done
    await new Promise(resolve => {
      let counter = 0;
      this.onWotSearch.emit({
        searchText: options.searchText,
        data,
        pubkeyAttributeName: options.pubkeyAttributeName,
        done: () => {
          counter++;
          if (counter === observerCount) {
            resolve();
          }
        }});
    });

    return data;
  }


  get additionalFields(): FormFieldDefinition[] {
    return this._additionalFields;
  }

  getAdditionalField(key: string): FormFieldDefinition | undefined {
    return this._additionalFields.find(f => f.key === key);
  }

  addAdditionalField(field: FormFieldDefinition) {
    if (!!this._additionalFields.find(f => f.key === field.key)) {
      throw new Error("Additional account field {" + field.key + "} already define.");
    }
    if (this._debug) console.debug("[wot-service] Adding additional account field {" + field.key + "}", field);
    this._additionalFields.push(field);
  }
}
