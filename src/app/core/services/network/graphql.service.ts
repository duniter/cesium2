import {Observable, Subject} from "rxjs";
import {Apollo} from "apollo-angular";
import {ApolloClient, ApolloQueryResult, FetchPolicy, WatchQueryFetchPolicy} from "apollo-client";
import {R} from "apollo-angular/types";
import {ErrorCodes, ServerErrorCodes, ServiceError} from "../errors";
import {catchError, map, timeout} from "rxjs/operators";

import {environment} from '../../../../environments/environment';
import {delay} from "q";
import {Injectable} from "@angular/core";
import {HttpLink, Options} from "apollo-angular-link-http";
import {NetworkService} from "./network.service";
import {WebSocketLink} from "apollo-link-ws";
import {ApolloLink} from "apollo-link";
import {defaultDataIdFromObject, InMemoryCache} from "apollo-cache-inmemory";
import {getMainDefinition} from 'apollo-utilities';
import {persistCache} from "apollo-cache-persist";
import {Storage} from "@ionic/storage";
import {AppWebSocket} from "./network.utils";
import {HttpClient, HttpParams} from "@angular/common/http";
import {Peer} from "./network.model";
import {AppFormUtils} from "../../core.module";


/**
 * Custom ID generation, for the GraphQL cache
 * @param object
 */
export const dataIdFromObject = function (object: Object): string {
  switch (object['__typename']) {

      // Define specific entity ID
      //case 'SpecificEntity':
      // return object['entityName'] + ':' + object['id'];

      // Fallback to default cache key
    default:
      return defaultDataIdFromObject(object);
  }
};


@Injectable({providedIn: 'root'})
export class GraphqlService {

  private _started = false;
  private httpParams: Options;
  private wsParams;
  private wsConnectionParams: { authToken?: string } = {};

  public onStart = new Subject<void>();

  protected _debug = false;
  protected _lastVariables: any = {
    loadAll: undefined,
    load: undefined
  };

  public constructor(
    private http: HttpClient,
    private apollo: Apollo,
    private httpLink: HttpLink,
    private networkService: NetworkService,
    private storage: Storage
  ) {

    // Start
    if (this.networkService.started) {
      this.start();
    }

    this.networkService.onStart.subscribe(() => this.restart());

    this._debug = !environment.production;
  }

  setAuthToken(authToken: string) {
    if (authToken) {
      console.debug("[graphql] Setting new authentication token");
      this.wsConnectionParams.authToken = authToken;
    } else {
      console.debug("[graphql] Resetting authentication token");
      delete this.wsConnectionParams.authToken;
      // Clear cache
      this.resetCache();
    }
  }

  async peerQuery<T, V = R>(peer: Peer,
                     opts: {
                       query: any,
                       variables?: V,
                       error?: ServiceError,
                       timeout?: number,
                       fetchPolicy?: FetchPolicy,
                       httpParams?: HttpParams | {
                         [param: string]: string | string[];
                       };
                     }): Promise<T> {
    const uri = (peer || this.networkService.peer).url + '/graphql';
    const query = (opts.query.loc.source.body).trim().replace(/^query [a-zA-Z0-9 \t]+/, "");
    //if (this._debug) console.debug(`[graphql] Executing query on peer {${uri}}:`, query);
    const requestBody = JSON.stringify({
      query: query,
      variables: opts.variables});
    const requestOptions = {
      params: opts.httpParams/* || this.httpParams*/,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    };
    let res;
    try {
      res = await this.http.post(uri, requestBody, requestOptions)
          // Add timeout
          .pipe(timeout(opts.timeout || environment.timeout || 500))
          .toPromise();

    } catch (err) {
      res = this.toApolloError<T>(err);
    }
    if (res.errors) {
      const error = res.errors[0] as any;
      if (error && error.code && error.message) {
        throw error;
      }
      console.error("[graphql] " + error.message);
      throw opts.error ? opts.error : error.message;
    }
    return res && res.data as T;
  }

  async query<T, V = R>(opts: {
    query: any,
    variables: V,
    error?: ServiceError,
    fetchPolicy?: FetchPolicy
  }): Promise<T> {
    let res;
    try {
      res = await (await this.getApollo()).query<ApolloQueryResult<T>, V>({
        query: opts.query,
        variables: opts.variables,
        fetchPolicy: opts.fetchPolicy || (environment.apolloFetchPolicy as FetchPolicy) || undefined
      }).toPromise();
    } catch (err) {
      res = this.toApolloError<T>(err);
    }
    if (res.errors) {
      const error = res.errors[0] as any;
      if (error && error.code && error.message) {
        throw error;
      }
      console.error("[graphql] " + error.message);
      throw opts.error ? opts.error : error.message;
    }
    return res.data;
  }

  public watchQuery<T, V = R>(opts: {
    query: any,
    variables?: V,
    error?: ServiceError,
    fetchPolicy?: WatchQueryFetchPolicy
  }): Observable<T> {
    return this.apollo.watchQuery<T, V>({
      query: opts.query,
      variables: opts.variables,
      fetchPolicy: opts.fetchPolicy || (environment.apolloFetchPolicy as FetchPolicy) || undefined,
      notifyOnNetworkStatusChange: true
    })
      .valueChanges
      .pipe(
        catchError(error => this.onApolloError<T>(error)),
        map(({data, errors}) => {
          if (errors) {
            const error = errors[0] as any;
            if (error && error.code && error.message) {
              throw error;
            }
            console.error("[graphql] " + error.message);
            throw opts.error ? opts.error : error.message;
          }
          return data;
        })
      );
  }

  public mutate<T, V = R>(opts: {
    mutation: any,
    variables: V,
    error?: ServiceError
  }): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      this.apollo.mutate<ApolloQueryResult<T>, V>({
        mutation: opts.mutation,
        variables: opts.variables
      })
        .catch(error => this.onApolloError<T>(error))
        .first()
        .subscribe(({data, errors}) => {
          if (errors) {
            const error = errors[0] as any;
            if (error && error.code && error.message) {
              reject(error);
            } else {
              console.error("[graphql] " + error.message);
              reject(opts.error ? opts.error : error.message);
            }
          } else {
            resolve(data as T);
          }
        });
    });
  }

  public subscribe<T, V = R>(opts: {
    query: any,
    variables: V,
    error?: ServiceError
  }): Observable<T> {

    return this.apollo.subscribe({
      query: opts.query,
      variables: opts.variables
    }, {
      useZone: true
    })
      .catch(error => this.onApolloError<T>(error))
      .pipe(
        map(({data, errors}) => {
          if (errors) {
            const error = errors[0];
            if (error && error.code && error.message) {
              throw error;
            }
            console.error("[graphql] " + error.message);
            throw opts.error ? opts.error : error.message;
          }
          return data;
        })
      );
  }

  public addToQueryCache<V = R>(opts: {
    query: any,
    variables: V
  }, propertyName: string, newValue: any) {

    try {
      const values = this.apollo.getClient().readQuery(opts);

      if (values && values[propertyName]) {
        values[propertyName].push(newValue);

        this.apollo.getClient().writeQuery({
          query: opts.query,
          variables: opts.variables,
          data: values
        });
        return; // OK: stop here
      }
    } catch (err) {
      // continue
      // read in cache is not guaranteed to return a result. see https://github.com/apollographql/react-apollo/issues/1776#issuecomment-372237940
    }
    if (this._debug) console.debug("[graphql] Unable to add entity to cache. Please check query has been cached, and {" + propertyName + "} exists in the result:", opts.query);
  }

  public addManyToQueryCache<V = R>(opts: {
    query: any,
    variables: V
  }, propertyName: string, newValues: any[]) {

    if (!newValues || !newValues.length) return; // nothing to process

    try {
      const values = this.apollo.getClient().readQuery(opts);

      if (values && values[propertyName]) {
        // Keep only not existing values
        newValues = newValues.filter(nv => !values[propertyName].find(v => nv['id'] === v['id'] && nv['entityName'] === v['entityName']));

        if (!newValues.length) return; // No new value

        // Update the cache
        values[propertyName] = values[propertyName].concat(newValues);
        this.apollo.getClient().writeQuery({
          query: opts.query,
          variables: opts.variables,
          data: values
        });
        return; // OK: stop here
      }
    } catch (err) {
      // continue
      // read in cache is not guaranteed to return a result. see https://github.com/apollographql/react-apollo/issues/1776#issuecomment-372237940
    }

    if (this._debug) console.debug("[graphql] Unable to add entities to cache. Please check query has been cached, and {" + propertyName + "} exists in the result:", opts.query);
  }

  public removeToQueryCacheById<V = R>(opts: {
    query: any,
    variables: V
  }, propertyName: string, idToRemove: number) {

    try {
      const values = this.apollo.getClient().readQuery(opts);

      if (values && values[propertyName]) {

        values[propertyName] = (values[propertyName] || []).filter(item => item['id'] !== idToRemove);
        this.apollo.getClient().writeQuery({
          query: opts.query,
          variables: opts.variables,
          data: values
        });

        return;
      }
    } catch (err) {
      // continue
      // read in cache is not guaranteed to return a result. see https://github.com/apollographql/react-apollo/issues/1776#issuecomment-372237940
    }
    console.warn("[graphql] Unable to remove id from cache. Please check {" + propertyName + "} exists in the result:", opts.query);
  }

  public removeToQueryCacheByIds<V = R>(opts: {
    query: any,
    variables: V
  }, propertyName: string, idsToRemove: number[]) {

    try {
      const values = this.apollo.getClient().readQuery(opts);

      if (values && values[propertyName]) {

        values[propertyName] = (values[propertyName] || []).reduce((result: any[], item: any) => {
          return idsToRemove.indexOf(item['id']) === -1 ? result.concat(item) : result;
        }, []);
        this.apollo.getClient().writeQuery({
          query: opts.query,
          variables: opts.variables,
          data: values
        });

        return;
      }
    } catch (err) {
      // continue
      // read in cache is not guaranteed to return a result. see https://github.com/apollographql/react-apollo/issues/1776#issuecomment-372237940
    }
    console.warn("[graphql] Unable to remove id from cache. Please check {" + propertyName + "} exists in the result:", opts.query);
  }

  /* -- protected methods -- */


  protected async start() {

    // Waiting for network service
    await this.networkService.ready();
    const peer = this.networkService.peer;
    if (!peer) throw Error("[graphql] Missing peer. Unable to start graphql service");

    // Skip, if GVA api is missing
    if (!peer.hasEndpoint('GVA')) {
      console.info("[graphql] Peer has NO GVA endpoint. Skipping init");
      this._started = false;
      return;
    }

    console.info("[graphql] Starting graphql...");
    const uri = peer.url + '/graphql';
    console.info("[graphql] Base uri: " + uri);
    this.httpParams = this.httpParams || {};
    this.httpParams.uri = uri;

    const wsUri = String.prototype.replace.call(uri, "http", "ws") + '/subscriptions';
    console.info("[graphql] Subscription uri: " + wsUri);
    this.wsParams = this.wsParams || {
      options: {
        lazy: true,
        reconnect: true,
        connectionParams: this.wsConnectionParams,
        addTypename: true
      },
      webSocketImpl: AppWebSocket
    };
    this.wsParams.uri = wsUri;


    const client = this.apollo.getClient();
    if (!client) {
      console.debug("[apollo] Creating GraphQL client...");

      // Http link
      const http = this.httpLink.create(this.httpParams);

      // Websocket link
      const ws = new WebSocketLink(this.wsParams);

      const authLink = new ApolloLink((operation, forward) => {

        // Use the setContext method to set the HTTP headers.
        operation.setContext({
          headers: {
            authorization: this.wsConnectionParams.authToken ? `token ${this.wsConnectionParams.authToken}` : ''
          }
        });

        // Call the next link in the middleware chain.
        return forward(operation);
      });

      const cache = new InMemoryCache({
        dataIdFromObject: dataIdFromObject
      });

      // Enable cache persistence
      if (environment.persistCache) {
        console.debug("[apollo] Starting persistence cache...");
        await persistCache({
          cache,
          storage: {
            getItem: (key: string) => this.storage.get(key),
            setItem: (key: string, data: any) => this.storage.set(key, data),
            removeItem: (key: string) => this.storage.remove(key)
          },
          debounce: 1000,
          debug: true
        });
      }

      // create Apollo
      this.apollo.create({
        link: ApolloLink.split(
          ({query}) => {
            const def = getMainDefinition(query);
            // If true, will link to http, else to WS
            return def.kind !== 'OperationDefinition' || def.operation !== 'subscription';
          },
          authLink.concat(http),
          ws
        ),
        cache,
        connectToDevTools: !environment.production
      }, 'default');
    }

    this._started = true;

    // Emit event
    this.onStart.next();
  }

  protected async stop() {
    this._started = false;
    await this.resetClient();
  }

  protected async restart() {
    if (this._started) await this.stop();
    await this.start();
  }


  protected async resetClient(client?: ApolloClient<any>) {
    client = client || this.apollo.getClient();
    if (!client) return;

    console.info("[apollo] Reset GraphQL client...");
    client.stop();
    await Promise.all([
      client.clearStore(),
      client.cache.reset()
    ]);
  }

  private onApolloError<T>(err: any): Observable<ApolloQueryResult<T>> {
    return Observable.of(this.toApolloError(err));
  }

  private toApolloError<T>(err: any): ApolloQueryResult<T> {
    const appError = (err.networkError && (this.toAppError(err.networkError) || this.createAppErrorByCode(ErrorCodes.UNKNOWN_NETWORK_ERROR))) ||
      (err.graphQLErrors && this.toAppError(err.graphQLErrors[0])) ||
      this.toAppError(err) ||
      this.toAppError(err.originalError);
    return {
      data: null,
      errors: appError && [appError] || err.graphQLErrors || [err],
      loading: false,
      networkStatus: null,
      stale: null
    };
  }

  private createAppErrorByCode(errorCode: number): any | undefined {
    const message = this.getI18nErrorMessageByCode(errorCode);
    if (message) return {
      code: errorCode,
      message: this.getI18nErrorMessageByCode(errorCode)
    };
    return undefined;
  }

  private getI18nErrorMessageByCode(errorCode: number): string | undefined {
    switch (errorCode) {
      case ServerErrorCodes.UNAUTHORIZED:
        return "ERROR.UNAUTHORIZED";
      case ServerErrorCodes.FORBIDDEN:
        return "ERROR.FORBIDDEN";
      case ErrorCodes.UNKNOWN_NETWORK_ERROR:
        return "ERROR.UNKNOWN_NETWORK_ERROR";
    }
    return undefined;
  }

  private toAppError(err: any): any | undefined {
    const message = err && err.message || err;
    if (typeof message == "string" && message.trim().indexOf('{"code":') == 0) {
      const error = JSON.parse(message);
      return error && this.createAppErrorByCode(error.code) || err;
    }
    return undefined;
  }


  private async getApollo(): Promise<Apollo> {
    while (!this._started) {
      console.debug("[graphql] Waiting apollo client... ");
      await delay(500);
    }
    return this.apollo;
  }

  private async resetCache(client?: ApolloClient<any>) {
    client = client || this.apollo.getClient();
    if (client) {
      console.debug("[graphql] Reset graphql cache... ");
      await client.cache.reset();
    }
  }
}
