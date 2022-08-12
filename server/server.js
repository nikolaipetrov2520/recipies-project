(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory(require('http'), require('fs'), require('crypto')) :
        typeof define === 'function' && define.amd ? define(['http', 'fs', 'crypto'], factory) :
            (global = typeof globalThis !== 'undefined' ? globalThis : global || self, global.Server = factory(global.http, global.fs, global.crypto));
}(this, (function (http, fs, crypto) {
    'use strict';

    function _interopDefaultLegacy(e) { return e && typeof e === 'object' && 'default' in e ? e : { 'default': e }; }

    var http__default = /*#__PURE__*/_interopDefaultLegacy(http);
    var fs__default = /*#__PURE__*/_interopDefaultLegacy(fs);
    var crypto__default = /*#__PURE__*/_interopDefaultLegacy(crypto);

    class ServiceError extends Error {
        constructor(message = 'Service Error') {
            super(message);
            this.name = 'ServiceError';
        }
    }

    class NotFoundError extends ServiceError {
        constructor(message = 'Resource not found') {
            super(message);
            this.name = 'NotFoundError';
            this.status = 404;
        }
    }

    class RequestError extends ServiceError {
        constructor(message = 'Request error') {
            super(message);
            this.name = 'RequestError';
            this.status = 400;
        }
    }

    class ConflictError extends ServiceError {
        constructor(message = 'Resource conflict') {
            super(message);
            this.name = 'ConflictError';
            this.status = 409;
        }
    }

    class AuthorizationError extends ServiceError {
        constructor(message = 'Unauthorized') {
            super(message);
            this.name = 'AuthorizationError';
            this.status = 401;
        }
    }

    class CredentialError extends ServiceError {
        constructor(message = 'Forbidden') {
            super(message);
            this.name = 'CredentialError';
            this.status = 403;
        }
    }

    var errors = {
        ServiceError,
        NotFoundError,
        RequestError,
        ConflictError,
        AuthorizationError,
        CredentialError
    };

    const { ServiceError: ServiceError$1 } = errors;


    function createHandler(plugins, services) {
        return async function handler(req, res) {
            const method = req.method;
            console.info(`<< ${req.method} ${req.url}`);

            // Redirect fix for admin panel relative paths
            if (req.url.slice(-6) == '/admin') {
                res.writeHead(302, {
                    'Location': `http://${req.headers.host}/admin/`
                });
                return res.end();
            }

            let status = 200;
            let headers = {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': 'application/json'
            };
            let result = '';
            let context;

            // NOTE: the OPTIONS method results in undefined result and also it never processes plugins - keep this in mind
            if (method == 'OPTIONS') {
                Object.assign(headers, {
                    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
                    'Access-Control-Allow-Credentials': false,
                    'Access-Control-Max-Age': '86400',
                    'Access-Control-Allow-Headers': 'X-Requested-With, X-HTTP-Method-Override, Content-Type, Accept, X-Authorization, X-Admin'
                });
            } else {
                try {
                    context = processPlugins();
                    await handle(context);
                } catch (err) {
                    if (err instanceof ServiceError$1) {
                        status = err.status || 400;
                        result = composeErrorObject(err.code || status, err.message);
                    } else {
                        // Unhandled exception, this is due to an error in the service code - REST consumers should never have to encounter this;
                        // If it happens, it must be debugged in a future version of the server
                        console.error(err);
                        status = 500;
                        result = composeErrorObject(500, 'Server Error');
                    }
                }
            }

            res.writeHead(status, headers);
            if (context != undefined && context.util != undefined && context.util.throttle) {
                await new Promise(r => setTimeout(r, 500 + Math.random() * 500));
            }
            res.end(result);

            function processPlugins() {
                const context = { params: {} };
                plugins.forEach(decorate => decorate(context, req));
                return context;
            }

            async function handle(context) {
                const { serviceName, tokens, query, body } = await parseRequest(req);
                if (serviceName == 'admin') {
                    return ({ headers, result } = services['admin'](method, tokens, query, body));
                } else if (serviceName == 'favicon.ico') {
                    return ({ headers, result } = services['favicon'](method, tokens, query, body));
                }

                const service = services[serviceName];

                if (service === undefined) {
                    status = 400;
                    result = composeErrorObject(400, `Service "${serviceName}" is not supported`);
                    console.error('Missing service ' + serviceName);
                } else {
                    result = await service(context, { method, tokens, query, body });
                }

                // NOTE: logout does not return a result
                // in this case the content type header should be omitted, to allow checks on the client
                if (result !== undefined) {
                    result = JSON.stringify(result);
                } else {
                    status = 204;
                    delete headers['Content-Type'];
                }
            }
        };
    }



    function composeErrorObject(code, message) {
        return JSON.stringify({
            code,
            message
        });
    }

    async function parseRequest(req) {
        const url = new URL(req.url, `http://${req.headers.host}`);
        const tokens = url.pathname.split('/').filter(x => x.length > 0);
        const serviceName = tokens.shift();
        const queryString = url.search.split('?')[1] || '';
        const query = queryString
            .split('&')
            .filter(s => s != '')
            .map(x => x.split('='))
            .reduce((p, [k, v]) => Object.assign(p, { [k]: decodeURIComponent(v) }), {});
        const body = await parseBody(req);

        return {
            serviceName,
            tokens,
            query,
            body
        };
    }

    function parseBody(req) {
        return new Promise((resolve, reject) => {
            let body = '';
            req.on('data', (chunk) => body += chunk.toString());
            req.on('end', () => {
                try {
                    resolve(JSON.parse(body));
                } catch (err) {
                    resolve(body);
                }
            });
        });
    }

    var requestHandler = createHandler;

    class Service {
        constructor() {
            this._actions = [];
            this.parseRequest = this.parseRequest.bind(this);
        }

        /**
         * Handle service request, after it has been processed by a request handler
         * @param {*} context Execution context, contains result of middleware processing
         * @param {{method: string, tokens: string[], query: *, body: *}} request Request parameters
         */
        async parseRequest(context, request) {
            for (let { method, name, handler } of this._actions) {
                if (method === request.method && matchAndAssignParams(context, request.tokens[0], name)) {
                    return await handler(context, request.tokens.slice(1), request.query, request.body);
                }
            }
        }

        /**
         * Register service action
         * @param {string} method HTTP method
         * @param {string} name Action name. Can be a glob pattern.
         * @param {(context, tokens: string[], query: *, body: *)} handler Request handler
         */
        registerAction(method, name, handler) {
            this._actions.push({ method, name, handler });
        }

        /**
         * Register GET action
         * @param {string} name Action name. Can be a glob pattern.
         * @param {(context, tokens: string[], query: *, body: *)} handler Request handler
         */
        get(name, handler) {
            this.registerAction('GET', name, handler);
        }

        /**
         * Register POST action
         * @param {string} name Action name. Can be a glob pattern.
         * @param {(context, tokens: string[], query: *, body: *)} handler Request handler
         */
        post(name, handler) {
            this.registerAction('POST', name, handler);
        }

        /**
         * Register PUT action
         * @param {string} name Action name. Can be a glob pattern.
         * @param {(context, tokens: string[], query: *, body: *)} handler Request handler
         */
        put(name, handler) {
            this.registerAction('PUT', name, handler);
        }

        /**
         * Register PATCH action
         * @param {string} name Action name. Can be a glob pattern.
         * @param {(context, tokens: string[], query: *, body: *)} handler Request handler
         */
        patch(name, handler) {
            this.registerAction('PATCH', name, handler);
        }

        /**
         * Register DELETE action
         * @param {string} name Action name. Can be a glob pattern.
         * @param {(context, tokens: string[], query: *, body: *)} handler Request handler
         */
        delete(name, handler) {
            this.registerAction('DELETE', name, handler);
        }
    }

    function matchAndAssignParams(context, name, pattern) {
        if (pattern == '*') {
            return true;
        } else if (pattern[0] == ':') {
            context.params[pattern.slice(1)] = name;
            return true;
        } else if (name == pattern) {
            return true;
        } else {
            return false;
        }
    }

    var Service_1 = Service;

    function uuid() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            let r = Math.random() * 16 | 0,
                v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }

    var util = {
        uuid
    };

    const uuid$1 = util.uuid;


    const data = fs__default['default'].existsSync('./data') ? fs__default['default'].readdirSync('./data').reduce((p, c) => {
        const content = JSON.parse(fs__default['default'].readFileSync('./data/' + c));
        const collection = c.slice(0, -5);
        p[collection] = {};
        for (let endpoint in content) {
            p[collection][endpoint] = content[endpoint];
        }
        return p;
    }, {}) : {};

    const actions = {
        get: (context, tokens, query, body) => {
            tokens = [context.params.collection, ...tokens];
            let responseData = data;
            for (let token of tokens) {
                if (responseData !== undefined) {
                    responseData = responseData[token];
                }
            }
            return responseData;
        },
        post: (context, tokens, query, body) => {
            tokens = [context.params.collection, ...tokens];
            console.log('Request body:\n', body);

            // TODO handle collisions, replacement
            let responseData = data;
            for (let token of tokens) {
                if (responseData.hasOwnProperty(token) == false) {
                    responseData[token] = {};
                }
                responseData = responseData[token];
            }

            const newId = uuid$1();
            responseData[newId] = Object.assign({}, body, { _id: newId });
            return responseData[newId];
        },
        put: (context, tokens, query, body) => {
            tokens = [context.params.collection, ...tokens];
            console.log('Request body:\n', body);

            let responseData = data;
            for (let token of tokens.slice(0, -1)) {
                if (responseData !== undefined) {
                    responseData = responseData[token];
                }
            }
            if (responseData !== undefined && responseData[tokens.slice(-1)] !== undefined) {
                responseData[tokens.slice(-1)] = body;
            }
            return responseData[tokens.slice(-1)];
        },
        patch: (context, tokens, query, body) => {
            tokens = [context.params.collection, ...tokens];
            console.log('Request body:\n', body);

            let responseData = data;
            for (let token of tokens) {
                if (responseData !== undefined) {
                    responseData = responseData[token];
                }
            }
            if (responseData !== undefined) {
                Object.assign(responseData, body);
            }
            return responseData;
        },
        delete: (context, tokens, query, body) => {
            tokens = [context.params.collection, ...tokens];
            let responseData = data;

            for (let i = 0; i < tokens.length; i++) {
                const token = tokens[i];
                if (responseData.hasOwnProperty(token) == false) {
                    return null;
                }
                if (i == tokens.length - 1) {
                    const body = responseData[token];
                    delete responseData[token];
                    return body;
                } else {
                    responseData = responseData[token];
                }
            }
        }
    };

    const dataService = new Service_1();
    dataService.get(':collection', actions.get);
    dataService.post(':collection', actions.post);
    dataService.put(':collection', actions.put);
    dataService.patch(':collection', actions.patch);
    dataService.delete(':collection', actions.delete);


    var jsonstore = dataService.parseRequest;

    /*
     * This service requires storage and auth plugins
     */

    const { AuthorizationError: AuthorizationError$1 } = errors;



    const userService = new Service_1();

    userService.get('me', getSelf);
    userService.post('register', onRegister);
    userService.post('login', onLogin);
    userService.get('logout', onLogout);


    function getSelf(context, tokens, query, body) {
        if (context.user) {
            const result = Object.assign({}, context.user);
            delete result.hashedPassword;
            return result;
        } else {
            throw new AuthorizationError$1();
        }
    }

    function onRegister(context, tokens, query, body) {
        return context.auth.register(body);
    }

    function onLogin(context, tokens, query, body) {
        return context.auth.login(body);
    }

    function onLogout(context, tokens, query, body) {
        return context.auth.logout();
    }

    var users = userService.parseRequest;

    const { NotFoundError: NotFoundError$1, RequestError: RequestError$1 } = errors;


    var crud = {
        get,
        post,
        put,
        patch,
        delete: del
    };


    function validateRequest(context, tokens, query) {
        /*
        if (context.params.collection == undefined) {
            throw new RequestError('Please, specify collection name');
        }
        */
        if (tokens.length > 1) {
            throw new RequestError$1();
        }
    }

    function parseWhere(query) {
        const operators = {
            '<=': (prop, value) => record => record[prop] <= JSON.parse(value),
            '<': (prop, value) => record => record[prop] < JSON.parse(value),
            '>=': (prop, value) => record => record[prop] >= JSON.parse(value),
            '>': (prop, value) => record => record[prop] > JSON.parse(value),
            '=': (prop, value) => record => record[prop] == JSON.parse(value),
            ' like ': (prop, value) => record => record[prop].toLowerCase().includes(JSON.parse(value).toLowerCase()),
            ' in ': (prop, value) => record => JSON.parse(`[${/\((.+?)\)/.exec(value)[1]}]`).includes(record[prop]),
        };
        const pattern = new RegExp(`^(.+?)(${Object.keys(operators).join('|')})(.+?)$`, 'i');

        try {
            let clauses = [query.trim()];
            let check = (a, b) => b;
            let acc = true;
            if (query.match(/ and /gi)) {
                // inclusive
                clauses = query.split(/ and /gi);
                check = (a, b) => a && b;
                acc = true;
            } else if (query.match(/ or /gi)) {
                // optional
                clauses = query.split(/ or /gi);
                check = (a, b) => a || b;
                acc = false;
            }
            clauses = clauses.map(createChecker);

            return (record) => clauses
                .map(c => c(record))
                .reduce(check, acc);
        } catch (err) {
            throw new Error('Could not parse WHERE clause, check your syntax.');
        }

        function createChecker(clause) {
            let [match, prop, operator, value] = pattern.exec(clause);
            [prop, value] = [prop.trim(), value.trim()];

            return operators[operator.toLowerCase()](prop, value);
        }
    }


    function get(context, tokens, query, body) {
        validateRequest(context, tokens);

        let responseData;

        try {
            if (query.where) {
                responseData = context.storage.get(context.params.collection).filter(parseWhere(query.where));
            } else if (context.params.collection) {
                responseData = context.storage.get(context.params.collection, tokens[0]);
            } else {
                // Get list of collections
                return context.storage.get();
            }

            if (query.sortBy) {
                const props = query.sortBy
                    .split(',')
                    .filter(p => p != '')
                    .map(p => p.split(' ').filter(p => p != ''))
                    .map(([p, desc]) => ({ prop: p, desc: desc ? true : false }));

                // Sorting priority is from first to last, therefore we sort from last to first
                for (let i = props.length - 1; i >= 0; i--) {
                    let { prop, desc } = props[i];
                    responseData.sort(({ [prop]: propA }, { [prop]: propB }) => {
                        if (typeof propA == 'number' && typeof propB == 'number') {
                            return (propA - propB) * (desc ? -1 : 1);
                        } else {
                            return propA.localeCompare(propB) * (desc ? -1 : 1);
                        }
                    });
                }
            }

            if (query.offset) {
                responseData = responseData.slice(Number(query.offset) || 0);
            }
            const pageSize = Number(query.pageSize) || 10;
            if (query.pageSize) {
                responseData = responseData.slice(0, pageSize);
            }

            if (query.distinct) {
                const props = query.distinct.split(',').filter(p => p != '');
                responseData = Object.values(responseData.reduce((distinct, c) => {
                    const key = props.map(p => c[p]).join('::');
                    if (distinct.hasOwnProperty(key) == false) {
                        distinct[key] = c;
                    }
                    return distinct;
                }, {}));
            }

            if (query.count) {
                return responseData.length;
            }

            if (query.select) {
                const props = query.select.split(',').filter(p => p != '');
                responseData = Array.isArray(responseData) ? responseData.map(transform) : transform(responseData);

                function transform(r) {
                    const result = {};
                    props.forEach(p => result[p] = r[p]);
                    return result;
                }
            }

            if (query.load) {
                const props = query.load.split(',').filter(p => p != '');
                props.map(prop => {
                    const [propName, relationTokens] = prop.split('=');
                    const [idSource, collection] = relationTokens.split(':');
                    console.log(`Loading related records from "${collection}" into "${propName}", joined on "_id"="${idSource}"`);
                    const storageSource = collection == 'users' ? context.protectedStorage : context.storage;
                    responseData = Array.isArray(responseData) ? responseData.map(transform) : transform(responseData);

                    function transform(r) {
                        const seekId = r[idSource];
                        const related = storageSource.get(collection, seekId);
                        delete related.hashedPassword;
                        r[propName] = related;
                        return r;
                    }
                });
            }

        } catch (err) {
            console.error(err);
            if (err.message.includes('does not exist')) {
                throw new NotFoundError$1();
            } else {
                throw new RequestError$1(err.message);
            }
        }

        context.canAccess(responseData);

        return responseData;
    }

    function post(context, tokens, query, body) {
        console.log('Request body:\n', body);

        validateRequest(context, tokens);
        if (tokens.length > 0) {
            throw new RequestError$1('Use PUT to update records');
        }
        context.canAccess(undefined, body);

        body._ownerId = context.user._id;
        let responseData;

        try {
            responseData = context.storage.add(context.params.collection, body);
        } catch (err) {
            throw new RequestError$1();
        }

        return responseData;
    }

    function put(context, tokens, query, body) {
        console.log('Request body:\n', body);

        validateRequest(context, tokens);
        if (tokens.length != 1) {
            throw new RequestError$1('Missing entry ID');
        }

        let responseData;
        let existing;

        try {
            existing = context.storage.get(context.params.collection, tokens[0]);
        } catch (err) {
            throw new NotFoundError$1();
        }

        context.canAccess(existing, body);

        try {
            responseData = context.storage.set(context.params.collection, tokens[0], body);
        } catch (err) {
            throw new RequestError$1();
        }

        return responseData;
    }

    function patch(context, tokens, query, body) {
        console.log('Request body:\n', body);

        validateRequest(context, tokens);
        if (tokens.length != 1) {
            throw new RequestError$1('Missing entry ID');
        }

        let responseData;
        let existing;

        try {
            existing = context.storage.get(context.params.collection, tokens[0]);
        } catch (err) {
            throw new NotFoundError$1();
        }

        context.canAccess(existing, body);

        try {
            responseData = context.storage.merge(context.params.collection, tokens[0], body);
        } catch (err) {
            throw new RequestError$1();
        }

        return responseData;
    }

    function del(context, tokens, query, body) {
        validateRequest(context, tokens);
        if (tokens.length != 1) {
            throw new RequestError$1('Missing entry ID');
        }

        let responseData;
        let existing;

        try {
            existing = context.storage.get(context.params.collection, tokens[0]);
        } catch (err) {
            throw new NotFoundError$1();
        }

        context.canAccess(existing);

        try {
            responseData = context.storage.delete(context.params.collection, tokens[0]);
        } catch (err) {
            throw new RequestError$1();
        }

        return responseData;
    }

    /*
     * This service requires storage and auth plugins
     */

    const dataService$1 = new Service_1();
    dataService$1.get(':collection', crud.get);
    dataService$1.post(':collection', crud.post);
    dataService$1.put(':collection', crud.put);
    dataService$1.patch(':collection', crud.patch);
    dataService$1.delete(':collection', crud.delete);

    var data$1 = dataService$1.parseRequest;

    const imgdata = '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Td4DLneAwSddMiRH8tMU8nng/Yy+KQsM3AKBNbe35j5OH4A0dbV8AxwcAqMFyl73eHd3e2//nmn29wOGi3Kv+RixSgAAEkxpVFh0WE1MOmNvbS5hZG9iZS54bXAAAAAAADw/eHBhY2tldCBiZWdpbj0i77u/IiBpZD0iVzVNME1wQ2VoaUh6cmVTek5UY3prYzlkIj8+Cjx4OnhtcG1ldGEgeG1sbnM6eD0iYWRvYmU6bnM6bWV0YS8iIHg6eG1wdGs9IlhNUCBDb3JlIDQuNC4wLUV4aXYyIj4KIDxyZGY6UkRGIHhtbG5zOnJkZj0iaHR0cDovL3d3dy53My5vcmcvMTk5OS8wMi8yMi1yZGYtc3ludGF4LW5zIyI+CiAgPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9IiIKICAgIHhtbG5zOmlwdGNFeHQ9Imh0dHA6Ly9pcHRjLm9yZy9zdGQvSXB0YzR4bXBFeHQvMjAwOC0wMi0yOS8iCiAgICB4bWxuczp4bXBNTT0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wL21tLyIKICAgIHhtbG5zOnN0RXZ0PSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvc1R5cGUvUmVzb3VyY2VFdmVudCMiCiAgICB4bWxuczpwbHVzPSJodHRwOi8vbnMudXNlcGx1cy5vcmcvbGRmL3htcC8xLjAvIgogICAgeG1sbnM6R0lNUD0iaHR0cDovL3d3dy5naW1wLm9yZy94bXAvIgogICAgeG1sbnM6ZGM9Imh0dHA6Ly9wdXJsLm9yZy9kYy9lbGVtZW50cy8xLjEvIgogICAgeG1sbnM6cGhvdG9zaG9wPSJodHRwOi8vbnMuYWRvYmUuY29tL3Bob3Rvc2hvcC8xLjAvIgogICAgeG1sbnM6eG1wPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvIgogICAgeG1sbnM6eG1wUmlnaHRzPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvcmlnaHRzLyIKICAgeG1wTU06RG9jdW1lbnRJRD0iZ2ltcDpkb2NpZDpnaW1wOjdjZDM3NWM3LTcwNmItNDlkMy1hOWRkLWNmM2Q3MmMwY2I4ZCIKICAgeG1wTU06SW5zdGFuY2VJRD0ieG1wLmlpZDo2NGY2YTJlYy04ZjA5LTRkZTMtOTY3ZC05MTUyY2U5NjYxNTAiCiAgIHhtcE1NOk9yaWdpbmFsRG9jdW1lbnRJRD0ieG1wLmRpZDoxMmE1NzI5Mi1kNmJkLTRlYjQtOGUxNi1hODEzYjMwZjU0NWYiCiAgIEdJTVA6QVBJPSIyLjAiCiAgIEdJTVA6UGxhdGZvcm09IldpbmRvd3MiCiAgIEdJTVA6VGltZVN0YW1wPSIxNjEzMzAwNzI5NTMwNjQzIgogICBHSU1QOlZlcnNpb249IjIuMTAuMTIiCiAgIGRjOkZvcm1hdD0iaW1hZ2UvcG5nIgogICBwaG90b3Nob3A6Q3JlZGl0PSJHZXR0eSBJbWFnZXMvaVN0b2NrcGhvdG8iCiAgIHhtcDpDcmVhdG9yVG9vbD0iR0lNUCAyLjEwIgogICB4bXBSaWdodHM6V2ViU3RhdGVtZW50PSJodHRwczovL3d3dy5pc3RvY2twaG90by5jb20vbGVnYWwvbGljZW5zZS1hZ3JlZW1lbnQ/dXRtX21lZGl1bT1vcmdhbmljJmFtcDt1dG1fc291cmNlPWdvb2dsZSZhbXA7dXRtX2NhbXBhaWduPWlwdGN1cmwiPgogICA8aXB0Y0V4dDpMb2NhdGlvbkNyZWF0ZWQ+CiAgICA8cmRmOkJhZy8+CiAgIDwvaXB0Y0V4dDpMb2NhdGlvbkNyZWF0ZWQ+CiAgIDxpcHRjRXh0OkxvY2F0aW9uU2hvd24+CiAgICA8cmRmOkJhZy8+CiAgIDwvaXB0Y0V4dDpMb2NhdGlvblNob3duPgogICA8aXB0Y0V4dDpBcnR3b3JrT3JPYmplY3Q+CiAgICA8cmRmOkJhZy8+CiAgIDwvaXB0Y0V4dDpBcnR3b3JrT3JPYmplY3Q+CiAgIDxpcHRjRXh0OlJlZ2lzdHJ5SWQ+CiAgICA8cmRmOkJhZy8+CiAgIDwvaXB0Y0V4dDpSZWdpc3RyeUlkPgogICA8eG1wTU06SGlzdG9yeT4KICAgIDxyZGY6U2VxPgogICAgIDxyZGY6bGkKICAgICAgc3RFdnQ6YWN0aW9uPSJzYXZlZCIKICAgICAgc3RFdnQ6Y2hhbmdlZD0iLyIKICAgICAgc3RFdnQ6aW5zdGFuY2VJRD0ieG1wLmlpZDpjOTQ2M2MxMC05OWE4LTQ1NDQtYmRlOS1mNzY0ZjdhODJlZDkiCiAgICAgIHN0RXZ0OnNvZnR3YXJlQWdlbnQ9IkdpbXAgMi4xMCAoV2luZG93cykiCiAgICAgIHN0RXZ0OndoZW49IjIwMjEtMDItMTRUMTM6MDU6MjkiLz4KICAgIDwvcmRmOlNlcT4KICAgPC94bXBNTTpIaXN0b3J5PgogICA8cGx1czpJbWFnZVN1cHBsaWVyPgogICAgPHJkZjpTZXEvPgogICA8L3BsdXM6SW1hZ2VTdXBwbGllcj4KICAgPHBsdXM6SW1hZ2VDcmVhdG9yPgogICAgPHJkZjpTZXEvPgogICA8L3BsdXM6SW1hZ2VDcmVhdG9yPgogICA8cGx1czpDb3B5cmlnaHRPd25lcj4KICAgIDxyZGY6U2VxLz4KICAgPC9wbHVzOkNvcHlyaWdodE93bmVyPgogICA8cGx1czpMaWNlbnNvcj4KICAgIDxyZGY6U2VxPgogICAgIDxyZGY6bGkKICAgICAgcGx1czpMaWNlbnNvclVSTD0iaHR0cHM6Ly93d3cuaXN0b2NrcGhvdG8uY29tL3Bob3RvL2xpY2Vuc2UtZ20xMTUwMzQ1MzQxLT91dG1fbWVkaXVtPW9yZ2FuaWMmYW1wO3V0bV9zb3VyY2U9Z29vZ2xlJmFtcDt1dG1fY2FtcGFpZ249aXB0Y3VybCIvPgogICAgPC9yZGY6U2VxPgogICA8L3BsdXM6TGljZW5zb3I+CiAgIDxkYzpjcmVhdG9yPgogICAgPHJkZjpTZXE+CiAgICAgPHJkZjpsaT5WbGFkeXNsYXYgU2VyZWRhPC9yZGY6bGk+CiAgICA8L3JkZjpTZXE+CiAgIDwvZGM6Y3JlYXRvcj4KICAgPGRjOmRlc2NyaXB0aW9uPgogICAgPHJkZjpBbHQ+CiAgICAgPHJkZjpsaSB4bWw6bGFuZz0ieC1kZWZhdWx0Ij5TZXJ2aWNlIHRvb2xzIGljb24gb24gd2hpdGUgYmFja2dyb3VuZC4gVmVjdG9yIGlsbHVzdHJhdGlvbi48L3JkZjpsaT4KICAgIDwvcmRmOkFsdD4KICAgPC9kYzpkZXNjcmlwdGlvbj4KICA8L3JkZjpEZXNjcmlwdGlvbj4KIDwvcmRmOlJERj4KPC94OnhtcG1ldGE+CiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAKPD94cGFja2V0IGVuZD0idyI/PmWJCnkAAAAGYktHRAD/AP8A/6C9p5MAAAAJcEhZcwAALiMAAC4jAXilP3YAAAAHdElNRQflAg4LBR0CZnO/AAAARHRFWHRDb21tZW50AFNlcnZpY2UgdG9vbHMgaWNvbiBvbiB3aGl0ZSBiYWNrZ3JvdW5kLiBWZWN0b3IgaWxsdXN0cmF0aW9uLlwvEeIAAAMxSURBVHja7Z1bcuQwCEX7qrLQXlp2ynxNVWbK7dgWj3sl9JvYRhxACD369erW7UMzx/cYaychonAQvXM5ABYkpynoYIiEGdoQog6AYfywBrCxF4zNrX/7McBbuXJe8rXx/KBDULcGsMREzCbeZ4J6ME/9wVH5d95rogZp3npEgPLP3m2iUSGqXBJS5Dr6hmLm8kRuZABYti5TMaailV8LodNQwTTUWk4/WZk75l0kM0aZQdaZjMqkrQDAuyMVJWFjMB4GANXr0lbZBxQKr7IjI7QvVWkok/Jn5UHVh61CYPs+/i7eL9j3y/Au8WqoAIC34k8/9k7N8miLcaGWHwgjZXE/awyYX7h41wKMCskZM2HXAddDkTdglpSjz5bcKPbcCEKwT3+DhxtVpJvkEC7rZSgq32NMSBoXaCdiahDCKrND0fpX8oQlVsQ8IFQZ1VARdIF5wroekAjB07gsAgDUIbQHFENIDEX4CQANIVe8Iw/ASiACLXl28eaf579OPuBa9/mrELUYHQ1t3KHlZZnRcXb2/c7ygXIQZqjDMEzeSrOgCAhqYMvTUE+FKXoVxTxgk3DEPREjGzj3nAk/VaKyB9GVIu4oMyOlrQZgrBBEFG9PAZTfs3amYDGrP9Wl964IeFvtz9JFluIvlEvcdoXDOdxggbDxGwTXcxFRi/LdirKgZUBm7SUdJG69IwSUzAMWgOAq/4hyrZVaJISSNWHFVbEoCFEhyBrCtXS9L+so9oTy8wGqxbQDD350WTjNESVFEB5hdKzUGcV5QtYxVWR2Ssl4Mg9qI9u6FCBInJRXgfEEgtS9Cgrg7kKouq4mdcDNBnEHQvWFTdgdgsqP+MiluVeBM13ahx09AYSWi50gsF+I6vn7BmCEoHR3NBzkpIOw4+XdVBBGQUioblaZHbGlodtB+N/jxqwLX/x/NARfD8ADxTOCKIcwE4Lw0OIbguMYcGTlymEpHYLXIKx8zQEqIfS2lGJPaADFEBR/PMH79ErqtpnZmTBlvM4wgihPWDEEhXn1LISj50crNgfCp+dWHYQRCfb2zgfnBZmKGAyi914anK9Coi4LOMhoAn3uVtn+AGnLKxPUZnCuAAAAAElFTkSuQmCC';
    const img = Buffer.from(imgdata, 'base64');

    var favicon = (method, tokens, query, body) => {
        console.log('serving favicon...');
        const headers = {
            'Content-Type': 'image/png',
            'Content-Length': img.length
        };
        let result = img;

        return {
            headers,
            result
        };
    };

    var require$$0 = "<!DOCTYPE html>\r\n<html lang=\"en\">\r\n<head>\r\n    <meta charset=\"UTF-8\">\r\n    <meta http-equiv=\"X-UA-Compatible\" content=\"IE=edge\">\r\n    <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">\r\n    <title>SUPS Admin Panel</title>\r\n    <style>\r\n        * {\r\n            padding: 0;\r\n            margin: 0;\r\n        }\r\n\r\n        body {\r\n            padding: 32px;\r\n            font-size: 16px;\r\n        }\r\n\r\n        .layout::after {\r\n            content: '';\r\n            clear: both;\r\n            display: table;\r\n        }\r\n\r\n        .col {\r\n            display: block;\r\n            float: left;\r\n        }\r\n\r\n        p {\r\n            padding: 8px 16px;\r\n        }\r\n\r\n        table {\r\n            border-collapse: collapse;\r\n        }\r\n\r\n        caption {\r\n            font-size: 120%;\r\n            text-align: left;\r\n            padding: 4px 8px;\r\n            font-weight: bold;\r\n            background-color: #ddd;\r\n        }\r\n\r\n        table, tr, th, td {\r\n            border: 1px solid #ddd;\r\n        }\r\n\r\n        th, td {\r\n            padding: 4px 8px;\r\n        }\r\n\r\n        ul {\r\n            list-style: none;\r\n        }\r\n\r\n        .collection-list a {\r\n            display: block;\r\n            width: 120px;\r\n            padding: 4px 8px;\r\n            text-decoration: none;\r\n            color: black;\r\n            background-color: #ccc;\r\n        }\r\n        .collection-list a:hover {\r\n            background-color: #ddd;\r\n        }\r\n        .collection-list a:visited {\r\n            color: black;\r\n        }\r\n    </style>\r\n    <script type=\"module\">\nimport { html, render } from 'https://unpkg.com/lit-html?module';\nimport { until } from 'https://unpkg.com/lit-html/directives/until?module';\n\nconst api = {\r\n    async get(url) {\r\n        return json(url);\r\n    },\r\n    async post(url, body) {\r\n        return json(url, {\r\n            method: 'POST',\r\n            headers: { 'Content-Type': 'application/json' },\r\n            body: JSON.stringify(body)\r\n        });\r\n    }\r\n};\r\n\r\nasync function json(url, options) {\r\n    return await (await fetch('/' + url, options)).json();\r\n}\r\n\r\nasync function getCollections() {\r\n    return api.get('data');\r\n}\r\n\r\nasync function getRecords(collection) {\r\n    return api.get('data/' + collection);\r\n}\r\n\r\nasync function getThrottling() {\r\n    return api.get('util/throttle');\r\n}\r\n\r\nasync function setThrottling(throttle) {\r\n    return api.post('util', { throttle });\r\n}\n\nasync function collectionList(onSelect) {\r\n    const collections = await getCollections();\r\n\r\n    return html`\r\n    <ul class=\"collection-list\">\r\n        ${collections.map(collectionLi)}\r\n    </ul>`;\r\n\r\n    function collectionLi(name) {\r\n        return html`<li><a href=\"javascript:void(0)\" @click=${(ev) => onSelect(ev, name)}>${name}</a></li>`;\r\n    }\r\n}\n\nasync function recordTable(collectionName) {\r\n    const records = await getRecords(collectionName);\r\n    const layout = getLayout(records);\r\n\r\n    return html`\r\n    <table>\r\n        <caption>${collectionName}</caption>\r\n        <thead>\r\n            <tr>${layout.map(f => html`<th>${f}</th>`)}</tr>\r\n        </thead>\r\n        <tbody>\r\n            ${records.map(r => recordRow(r, layout))}\r\n        </tbody>\r\n    </table>`;\r\n}\r\n\r\nfunction getLayout(records) {\r\n    const result = new Set(['_id']);\r\n    records.forEach(r => Object.keys(r).forEach(k => result.add(k)));\r\n\r\n    return [...result.keys()];\r\n}\r\n\r\nfunction recordRow(record, layout) {\r\n    return html`\r\n    <tr>\r\n        ${layout.map(f => html`<td>${JSON.stringify(record[f]) || html`<span>(missing)</span>`}</td>`)}\r\n    </tr>`;\r\n}\n\nasync function throttlePanel(display) {\r\n    const active = await getThrottling();\r\n\r\n    return html`\r\n    <p>\r\n        Request throttling: </span>${active}</span>\r\n        <button @click=${(ev) => set(ev, true)}>Enable</button>\r\n        <button @click=${(ev) => set(ev, false)}>Disable</button>\r\n    </p>`;\r\n\r\n    async function set(ev, state) {\r\n        ev.target.disabled = true;\r\n        await setThrottling(state);\r\n        display();\r\n    }\r\n}\n\n//import page from '//unpkg.com/page/page.mjs';\r\n\r\n\r\nfunction start() {\r\n    const main = document.querySelector('main');\r\n    editor(main);\r\n}\r\n\r\nasync function editor(main) {\r\n    let list = html`<div class=\"col\">Loading&hellip;</div>`;\r\n    let viewer = html`<div class=\"col\">\r\n    <p>Select collection to view records</p>\r\n</div>`;\r\n    display();\r\n\r\n    list = html`<div class=\"col\">${await collectionList(onSelect)}</div>`;\r\n    display();\r\n\r\n    async function display() {\r\n        render(html`\r\n        <section class=\"layout\">\r\n            ${until(throttlePanel(display), html`<p>Loading</p>`)}\r\n        </section>\r\n        <section class=\"layout\">\r\n            ${list}\r\n            ${viewer}\r\n        </section>`, main);\r\n    }\r\n\r\n    async function onSelect(ev, name) {\r\n        ev.preventDefault();\r\n        viewer = html`<div class=\"col\">${await recordTable(name)}</div>`;\r\n        display();\r\n    }\r\n}\r\n\r\nstart();\n\n</script>\r\n</head>\r\n<body>\r\n    <main>\r\n        Loading&hellip;\r\n    </main>\r\n</body>\r\n</html>";

    const mode = process.argv[2] == '-dev' ? 'dev' : 'prod';

    const files = {
        index: mode == 'prod' ? require$$0 : fs__default['default'].readFileSync('./client/index.html', 'utf-8')
    };

    var admin = (method, tokens, query, body) => {
        const headers = {
            'Content-Type': 'text/html'
        };
        let result = '';

        const resource = tokens.join('/');
        if (resource && resource.split('.').pop() == 'js') {
            headers['Content-Type'] = 'application/javascript';

            files[resource] = files[resource] || fs__default['default'].readFileSync('./client/' + resource, 'utf-8');
            result = files[resource];
        } else {
            result = files.index;
        }

        return {
            headers,
            result
        };
    };

    /*
     * This service requires util plugin
     */

    const utilService = new Service_1();

    utilService.post('*', onRequest);
    utilService.get(':service', getStatus);

    function getStatus(context, tokens, query, body) {
        return context.util[context.params.service];
    }

    function onRequest(context, tokens, query, body) {
        Object.entries(body).forEach(([k, v]) => {
            console.log(`${k} ${v ? 'enabled' : 'disabled'}`);
            context.util[k] = v;
        });
        return '';
    }

    var util$1 = utilService.parseRequest;

    var services = {
        jsonstore,
        users,
        data: data$1,
        favicon,
        admin,
        util: util$1
    };

    const { uuid: uuid$2 } = util;


    function initPlugin(settings) {
        const storage = createInstance(settings.seedData);
        const protectedStorage = createInstance(settings.protectedData);

        return function decoreateContext(context, request) {
            context.storage = storage;
            context.protectedStorage = protectedStorage;
        };
    }


    /**
     * Create storage instance and populate with seed data
     * @param {Object=} seedData Associative array with data. Each property is an object with properties in format {key: value}
     */
    function createInstance(seedData = {}) {
        const collections = new Map();

        // Initialize seed data from file    
        for (let collectionName in seedData) {
            if (seedData.hasOwnProperty(collectionName)) {
                const collection = new Map();
                for (let recordId in seedData[collectionName]) {
                    if (seedData.hasOwnProperty(collectionName)) {
                        collection.set(recordId, seedData[collectionName][recordId]);
                    }
                }
                collections.set(collectionName, collection);
            }
        }


        // Manipulation

        /**
         * Get entry by ID or list of all entries from collection or list of all collections
         * @param {string=} collection Name of collection to access. Throws error if not found. If omitted, returns list of all collections.
         * @param {number|string=} id ID of requested entry. Throws error if not found. If omitted, returns of list all entries in collection.
         * @return {Object} Matching entry.
         */
        function get(collection, id) {
            if (!collection) {
                return [...collections.keys()];
            }
            if (!collections.has(collection)) {
                throw new ReferenceError('Collection does not exist: ' + collection);
            }
            const targetCollection = collections.get(collection);
            if (!id) {
                const entries = [...targetCollection.entries()];
                let result = entries.map(([k, v]) => {
                    return Object.assign(deepCopy(v), { _id: k });
                });
                return result;
            }
            if (!targetCollection.has(id)) {
                throw new ReferenceError('Entry does not exist: ' + id);
            }
            const entry = targetCollection.get(id);
            return Object.assign(deepCopy(entry), { _id: id });
        }

        /**
         * Add new entry to collection. ID will be auto-generated
         * @param {string} collection Name of collection to access. If the collection does not exist, it will be created.
         * @param {Object} data Value to store.
         * @return {Object} Original value with resulting ID under _id property.
         */
        function add(collection, data) {
            const record = assignClean({ _ownerId: data._ownerId }, data);

            let targetCollection = collections.get(collection);
            if (!targetCollection) {
                targetCollection = new Map();
                collections.set(collection, targetCollection);
            }
            let id = uuid$2();
            // Make sure new ID does not match existing value
            while (targetCollection.has(id)) {
                id = uuid$2();
            }

            record._createdOn = Date.now();
            targetCollection.set(id, record);
            return Object.assign(deepCopy(record), { _id: id });
        }

        /**
         * Replace entry by ID
         * @param {string} collection Name of collection to access. Throws error if not found.
         * @param {number|string} id ID of entry to update. Throws error if not found.
         * @param {Object} data Value to store. Record will be replaced!
         * @return {Object} Updated entry.
         */
        function set(collection, id, data) {
            if (!collections.has(collection)) {
                throw new ReferenceError('Collection does not exist: ' + collection);
            }
            const targetCollection = collections.get(collection);
            if (!targetCollection.has(id)) {
                throw new ReferenceError('Entry does not exist: ' + id);
            }

            const existing = targetCollection.get(id);
            const record = assignSystemProps(deepCopy(data), existing);
            record._updatedOn = Date.now();
            targetCollection.set(id, record);
            return Object.assign(deepCopy(record), { _id: id });
        }

        /**
         * Modify entry by ID
         * @param {string} collection Name of collection to access. Throws error if not found.
         * @param {number|string} id ID of entry to update. Throws error if not found.
         * @param {Object} data Value to store. Shallow merge will be performed!
         * @return {Object} Updated entry.
         */
        function merge(collection, id, data) {
            if (!collections.has(collection)) {
                throw new ReferenceError('Collection does not exist: ' + collection);
            }
            const targetCollection = collections.get(collection);
            if (!targetCollection.has(id)) {
                throw new ReferenceError('Entry does not exist: ' + id);
            }

            const existing = deepCopy(targetCollection.get(id));
            const record = assignClean(existing, data);
            record._updatedOn = Date.now();
            targetCollection.set(id, record);
            return Object.assign(deepCopy(record), { _id: id });
        }

        /**
         * Delete entry by ID
         * @param {string} collection Name of collection to access. Throws error if not found.
         * @param {number|string} id ID of entry to update. Throws error if not found.
         * @return {{_deletedOn: number}} Server time of deletion.
         */
        function del(collection, id) {
            if (!collections.has(collection)) {
                throw new ReferenceError('Collection does not exist: ' + collection);
            }
            const targetCollection = collections.get(collection);
            if (!targetCollection.has(id)) {
                throw new ReferenceError('Entry does not exist: ' + id);
            }
            targetCollection.delete(id);

            return { _deletedOn: Date.now() };
        }

        /**
         * Search in collection by query object
         * @param {string} collection Name of collection to access. Throws error if not found.
         * @param {Object} query Query object. Format {prop: value}.
         * @return {Object[]} Array of matching entries.
         */
        function query(collection, query) {
            if (!collections.has(collection)) {
                throw new ReferenceError('Collection does not exist: ' + collection);
            }
            const targetCollection = collections.get(collection);
            const result = [];
            // Iterate entries of target collection and compare each property with the given query
            for (let [key, entry] of [...targetCollection.entries()]) {
                let match = true;
                for (let prop in entry) {
                    if (query.hasOwnProperty(prop)) {
                        const targetValue = query[prop];
                        // Perform lowercase search, if value is string
                        if (typeof targetValue === 'string' && typeof entry[prop] === 'string') {
                            if (targetValue.toLocaleLowerCase() !== entry[prop].toLocaleLowerCase()) {
                                match = false;
                                break;
                            }
                        } else if (targetValue != entry[prop]) {
                            match = false;
                            break;
                        }
                    }
                }

                if (match) {
                    result.push(Object.assign(deepCopy(entry), { _id: key }));
                }
            }

            return result;
        }

        return { get, add, set, merge, delete: del, query };
    }


    function assignSystemProps(target, entry, ...rest) {
        const whitelist = [
            '_id',
            '_createdOn',
            '_updatedOn',
            '_ownerId'
        ];
        for (let prop of whitelist) {
            if (entry.hasOwnProperty(prop)) {
                target[prop] = deepCopy(entry[prop]);
            }
        }
        if (rest.length > 0) {
            Object.assign(target, ...rest);
        }

        return target;
    }


    function assignClean(target, entry, ...rest) {
        const blacklist = [
            '_id',
            '_createdOn',
            '_updatedOn',
            '_ownerId'
        ];
        for (let key in entry) {
            if (blacklist.includes(key) == false) {
                target[key] = deepCopy(entry[key]);
            }
        }
        if (rest.length > 0) {
            Object.assign(target, ...rest);
        }

        return target;
    }

    function deepCopy(value) {
        if (Array.isArray(value)) {
            return value.map(deepCopy);
        } else if (typeof value == 'object') {
            return [...Object.entries(value)].reduce((p, [k, v]) => Object.assign(p, { [k]: deepCopy(v) }), {});
        } else {
            return value;
        }
    }

    var storage = initPlugin;

    const { ConflictError: ConflictError$1, CredentialError: CredentialError$1, RequestError: RequestError$2 } = errors;

    function initPlugin$1(settings) {
        const identity = settings.identity;

        return function decorateContext(context, request) {
            context.auth = {
                register,
                login,
                logout
            };

            const userToken = request.headers['x-authorization'];
            if (userToken !== undefined) {
                let user;
                const session = findSessionByToken(userToken);
                if (session !== undefined) {
                    const userData = context.protectedStorage.get('users', session.userId);
                    if (userData !== undefined) {
                        console.log('Authorized as ' + userData[identity]);
                        user = userData;
                    }
                }
                if (user !== undefined) {
                    context.user = user;
                } else {
                    throw new CredentialError$1('Invalid access token');
                }
            }

            function register(body) {
                if (body.hasOwnProperty(identity) === false ||
                    body.hasOwnProperty('password') === false ||
                    body[identity].length == 0 ||
                    body.password.length == 0) {
                    throw new RequestError$2('Missing fields');
                } else if (context.protectedStorage.query('users', { [identity]: body[identity] }).length !== 0) {
                    throw new ConflictError$1(`A user with the same ${identity} already exists`);
                } else {
                    const newUser = Object.assign({}, body, {
                        [identity]: body[identity],
                        hashedPassword: hash(body.password)
                    });
                    const result = context.protectedStorage.add('users', newUser);
                    delete result.hashedPassword;

                    const session = saveSession(result._id);
                    result.accessToken = session.accessToken;

                    return result;
                }
            }

            function login(body) {
                const targetUser = context.protectedStorage.query('users', { [identity]: body[identity] });
                if (targetUser.length == 1) {
                    if (hash(body.password) === targetUser[0].hashedPassword) {
                        const result = targetUser[0];
                        delete result.hashedPassword;

                        const session = saveSession(result._id);
                        result.accessToken = session.accessToken;

                        return result;
                    } else {
                        throw new CredentialError$1('Login or password don\'t match');
                    }
                } else {
                    throw new CredentialError$1('Login or password don\'t match');
                }
            }

            function logout() {
                if (context.user !== undefined) {
                    const session = findSessionByUserId(context.user._id);
                    if (session !== undefined) {
                        context.protectedStorage.delete('sessions', session._id);
                    }
                } else {
                    throw new CredentialError$1('User session does not exist');
                }
            }

            function saveSession(userId) {
                let session = context.protectedStorage.add('sessions', { userId });
                const accessToken = hash(session._id);
                session = context.protectedStorage.set('sessions', session._id, Object.assign({ accessToken }, session));
                return session;
            }

            function findSessionByToken(userToken) {
                return context.protectedStorage.query('sessions', { accessToken: userToken })[0];
            }

            function findSessionByUserId(userId) {
                return context.protectedStorage.query('sessions', { userId })[0];
            }
        };
    }


    const secret = 'This is not a production server';

    function hash(string) {
        const hash = crypto__default['default'].createHmac('sha256', secret);
        hash.update(string);
        return hash.digest('hex');
    }

    var auth = initPlugin$1;

    function initPlugin$2(settings) {
        const util = {
            throttle: false
        };

        return function decoreateContext(context, request) {
            context.util = util;
        };
    }

    var util$2 = initPlugin$2;

    /*
     * This plugin requires auth and storage plugins
     */

    const { RequestError: RequestError$3, ConflictError: ConflictError$2, CredentialError: CredentialError$2, AuthorizationError: AuthorizationError$2 } = errors;

    function initPlugin$3(settings) {
        const actions = {
            'GET': '.read',
            'POST': '.create',
            'PUT': '.update',
            'PATCH': '.update',
            'DELETE': '.delete'
        };
        const rules = Object.assign({
            '*': {
                '.create': ['User'],
                '.update': ['Owner'],
                '.delete': ['Owner']
            }
        }, settings.rules);

        return function decorateContext(context, request) {
            // special rules (evaluated at run-time)
            const get = (collectionName, id) => {
                return context.storage.get(collectionName, id);
            };
            const isOwner = (user, object) => {
                return user._id == object._ownerId;
            };
            context.rules = {
                get,
                isOwner
            };
            const isAdmin = request.headers.hasOwnProperty('x-admin');

            context.canAccess = canAccess;

            function canAccess(data, newData) {
                const user = context.user;
                const action = actions[request.method];
                let { rule, propRules } = getRule(action, context.params.collection, data);

                if (Array.isArray(rule)) {
                    rule = checkRoles(rule, data);
                } else if (typeof rule == 'string') {
                    rule = !!(eval(rule));
                }
                if (!rule && !isAdmin) {
                    throw new CredentialError$2();
                }
                propRules.map(r => applyPropRule(action, r, user, data, newData));
            }

            function applyPropRule(action, [prop, rule], user, data, newData) {
                // NOTE: user needs to be in scope for eval to work on certain rules
                if (typeof rule == 'string') {
                    rule = !!eval(rule);
                }

                if (rule == false) {
                    if (action == '.create' || action == '.update') {
                        delete newData[prop];
                    } else if (action == '.read') {
                        delete data[prop];
                    }
                }
            }

            function checkRoles(roles, data, newData) {
                if (roles.includes('Guest')) {
                    return true;
                } else if (!context.user && !isAdmin) {
                    throw new AuthorizationError$2();
                } else if (roles.includes('User')) {
                    return true;
                } else if (context.user && roles.includes('Owner')) {
                    return context.user._id == data._ownerId;
                } else {
                    return false;
                }
            }
        };



        function getRule(action, collection, data = {}) {
            let currentRule = ruleOrDefault(true, rules['*'][action]);
            let propRules = [];

            // Top-level rules for the collection
            const collectionRules = rules[collection];
            if (collectionRules !== undefined) {
                // Top-level rule for the specific action for the collection
                currentRule = ruleOrDefault(currentRule, collectionRules[action]);

                // Prop rules
                const allPropRules = collectionRules['*'];
                if (allPropRules !== undefined) {
                    propRules = ruleOrDefault(propRules, getPropRule(allPropRules, action));
                }

                // Rules by record id 
                const recordRules = collectionRules[data._id];
                if (recordRules !== undefined) {
                    currentRule = ruleOrDefault(currentRule, recordRules[action]);
                    propRules = ruleOrDefault(propRules, getPropRule(recordRules, action));
                }
            }

            return {
                rule: currentRule,
                propRules
            };
        }

        function ruleOrDefault(current, rule) {
            return (rule === undefined || rule.length === 0) ? current : rule;
        }

        function getPropRule(record, action) {
            const props = Object
                .entries(record)
                .filter(([k]) => k[0] != '.')
                .filter(([k, v]) => v.hasOwnProperty(action))
                .map(([k, v]) => [k, v[action]]);

            return props;
        }
    }

    var rules = initPlugin$3;

    var identity = "email";
    var protectedData = {
        users: {
            "35c62d76-8152-4626-8712-eeb96381bea8": {
                email: "peter@abv.bg",
                username: "peter",
                hashedPassword: "83313014ed3e2391aa1332615d2f053cf5c1bfe05ca1cbcb5582443822df6eb1"
            },
            "847ec027-f659-4086-8032-5173e2f9c93a": {
                email: "john@abv.bg",
                username: "john",
                hashedPassword: "83313014ed3e2391aa1332615d2f053cf5c1bfe05ca1cbcb5582443822df6eb1"
            },
        },
        sessions: {
        }
    };
    var seedData = {
        recipies: {
            "ff436770-76c5-40e2-b231-77409eda7a61": {
                "_ownerId": "847ec027-f659-4086-8032-5173e2f9c93a",
                "_createdOn": 1617194128619,
                "title": "Супа със свинско и тученица",
                "category":"Супа",
                "neededTime": "90 min",
                "portions": 10,
                "preparationTime": "30 min",
                "image": "https://recepti.gotvach.bg/files/lib/400x296/supa-tuchenica.jpg",
                "preparation": "Месото се слага да ври за около 1 час. Колкото повече ври, толкова по-добре. Във водата се слагат 2-3 с.л. сол с връх.След като е увряло месото, водата се изхвърля, а месото се почиства и нарязва на малки кубчета.В тиган се запържват лукът, чесънът и се добавя месото. 1/3 от Тученицата се запържва, като се добавя към месото, лукът и чесънът, но за около минута-две. В тенджера се добавя всичко без фидето. Когато картофите са уврели, се добавя и фидето към вкусната свинска супа. Накрая се добавя и разбитото кисело мляко. Сол на вкус, но в тази селска супа добавих 1 с.л. сол с връх. Поднася се с лимон или се добавят 1-2 щипки лимонтузу. Приятен апетит с моята супа със свинско и тученица.",
                "ingredients": [
                    { "name":"свинско месо", "quantity": "300 г"},
                    { "name":"тученица", "quantity": "300 г"},
                    { "name":"моркови", "quantity": "300 г"},
                    { "name":"фиде", "quantity": "200 г"},
                    { "name":"лук", "quantity": "150 г"},
                    { "name":"картофи", "quantity": "300 г"},
                    { "name":"олио", "quantity": "80 мл"},
                    { "name":"чесън", "quantity": "6 скилидки"},
                    { "name":"джоджен", "quantity": "7 пресни листа"},
                    { "name":"вода", "quantity": "4 л"},
                    { "name":"чушка", "quantity": "1 бр."},
                    { "name":"кисело мляко", "quantity": "2 с.л."}
                ]
            },
            "1840a313-225c-416a-817a-9954d4609f7c": {
                "_ownerId": "35c62d76-8152-4626-8712-eeb96381bea8",
                "_createdOn": 1617194128618,
                "title": "Здравословна салата с конопено семе",
                "category":"Салата",
                "neededTime": "10 min",
                "portions": 2,
                "preparationTime": "10 min",
                "image": "https://gradcontent.com/lib/400x296/tabule-rozov-domat1.jpg",
                "preparation": "Моят микс зелени салати включва валериана или бейби спанак, лоло верде, рукола). Накиснете бадемите във вода от предната нощ или от сутринта, ако ще правите вкусната зелена салата за вечеря. След като са добре омекнали, ги обелете. Измийте зелената салата и хубаво я отцедете. Ако ползвате такава с по-големи листа, ги накъсайте в купа. Обелете и нарежете доматите на кубчета и сложете при свежата салата, разбърквайки леко с ръка или прибори за салата. Пригответе дресинг като смесите лененото масло със ябълковия оцет, боровия мед и солта. Овкусете листата и доматите и прехвърлете в две отделни чинии или една обща салатиера. Сложете целите бадеми, сушените червени боровинки и каперсите. Поръсете обилно с изключително полезното и здравословно конопено семе и поднесете здравословна салата с конопено семе.",
                "ingredients": [
                    { "name":"зелена салата", "quantity": "125 г микс"},
                    { "name":"конопено семе", "quantity": "2 с.л."},
                    { "name":"домат", "quantity": "2 бр. Рома"},
                    { "name":"слънчогледово семе", "quantity": "2-3 с.л."},
                    { "name":"каперси ", "quantity": "2 с.л."},
                    { "name":"червени боровинки", "quantity": "2 с.л."},
                    { "name":"бадеми", "quantity": "1 шепа, сурови"},
                    { "name":"ленено масло", "quantity": "4 с.л. или хубав зехтин"},
                    { "name":"ябълков оцет", "quantity": "на вкус"},
                    { "name":"хималайска сол", "quantity": "на вкус"},
                    { "name":"черен пипер ", "quantity": "2 щипки, прясно смлян"},
                    { "name":"боров мед", "quantity": "1 ч.л."}
                ]
            },
            "126777f5-3277-42ad-b874-76d043b069cb": {
                "_ownerId": "35c62d76-8152-4626-8712-eeb96381bea8",
                "_createdOn": 1617194128620,
                "title": "Млечно желе с плодове",
                "category":"Десерт",
                "neededTime": "20 min",
                "portions": 4,
                "preparationTime": "20 min",
                "image": "https://gradcontent.com/lib/400x296/mlechnojele.jpeg",
                "preparation": "Нарязваме бананите, кайсиите и прасковите на малки парченца. Смесваме киселото мляко, захарта и йогурта в купа. Разтваряме желатина във водата, оставяме го за кратко да набъбне и го загряваме на водна баня или в микровълнова до разтопяване. Сипваме го в млечната смес и разбъркваме. Добавяме нарязаните плодове и боровинките. Разбъркваме. Изсипваме сместа във форма по избор/ може и силиконова - това ще улесни отделянето на десерта/. Прибираме плодовото желе в хладилника за 24 часа. Нарязваме готовия летен сладкиш на квадрати и всеки украсяваме с бита сметана. Нашето млечно желе с плодове е готово.",
                "ingredients": [
                    { "name":"кисело мляко", "quantity": " 500 г"},
                    { "name":"захар", "quantity": "4 с.л."},
                    { "name":"йогурт", "quantity": " 300 г с горски плодове"},
                    { "name":"банани", "quantity": "2 бр."},
                    { "name":"кайсии", "quantity": "4 бр."},
                    { "name":"праскови", "quantity": "32 бр."},
                    { "name":"боровинки", "quantity": "1 ч.л."},
                    { "name":"желатин", "quantity": "2 пакетчета"},
                    { "name":"вода", "quantity": "2 с.л."},
                    { "name":"сметана", "quantity": "за украса / бита/"}
                ]
            },
            "136777f5-3277-42ad-b874-76d043b069cb": {
                "_ownerId": "35c62d76-8152-4626-8712-eeb96381bea8",
                "_createdOn": 1617194128613,
                "title": "Класически миш-маш",
                "category":"Основно",
                "neededTime": "60 min",
                "portions": 10,
                "preparationTime": "30 min",
                "image": "https://gradcontent.com/lib/400x296/qkmishmash.jpg",
                "preparation": "Месото се слага да ври за около 1 час. Колкото повече ври, толкова по-добре. Във водата се слагат 2-3 с.л. сол с връх.След като е увряло месото, водата се изхвърля, а месото се почиства и нарязва на малки кубчета.В тиган се запържват лукът, чесънът и се добавя месото. 1/3 от Тученицата се запържва, като се добавя към месото, лукът и чесънът, но за около минута-две. В тенджера се добавя всичко без фидето. Когато картофите са уврели, се добавя и фидето към вкусната свинска супа. Накрая се добавя и разбитото кисело мляко. Сол на вкус, но в тази селска супа добавих 1 с.л. сол с връх. Поднася се с лимон или се добавят 1-2 щипки лимонтузу. Приятен апетит с моята супа със свинско и тученица.",
                "ingredients": [
                    { "name":"чушки", "quantity": "2 кг"},
                    { "name":"домати", "quantity": "1 кг"},
                    { "name":"лук", "quantity": "500 г"},
                    { "name":"сирене", "quantity": "500 г"},
                    { "name":"яйца", "quantity": "15 бр."},
                    { "name":"олио", "quantity": "200-300 мл"},
                    { "name":"магданоз", "quantity": "1 връзка"}
                ]
            },
            "3f72358f-c3ad-4f8c-831c-a7fa33cdadde": {
                "_ownerId": "847ec027-f659-4086-8032-5173e2f9c93a",
                "title": "Таратор",
                "category": "Супа",
                "preparationTime": "10 мин.",
                "neededTime": "10 мин",
                "portions": "6",
                "image": "https://www.foodbook.bg/storage/images/dishes/tarator/main.jpeg",
                "preparation": "смесваме всичко и охлаждаме в хладилника.",
                "ingredients": [
                    {
                        "name": "картавица",
                        "quantity": "1 брой"
                    },
                    {
                        "name": "кисело мляко",
                        "quantity": "1 кофичка"
                    },
                    {
                        "name": "олио",
                        "quantity": "на вкус"
                    },
                    {
                        "name": "сол",
                        "quantity": " на вкус"
                    },
                    {
                        "name": "чесън",
                        "quantity": "1 скилитка"
                    },
                    {
                        "name": "копър",
                        "quantity": "10 стъка"
                    },
                    {
                        "name": "вода",
                        "quantity": "0.5 кофички"
                    }
                ],
                "_createdOn": 1659471348372,
            },
            "8bdd1772-527a-41c1-acee-2cd72e02d905":
            {
                "_ownerId": "847ec027-f659-4086-8032-5173e2f9c93a",
                "title": "Домашен кекс с прясно мляко",
                "category": "Десерт",
                "preparationTime": "25 мин.",
                "neededTime": "50мин.",
                "portions": "12",
                "image": "https://gradcontent.com/lib/400x296/kekszalivkapudra.jpeg",
                "preparation": "Разбийте добре до побеляване яйцата със захарта и добавете прясното мляко, постепенно бакпулвера и олиото и отново хубаво разбийте. Пресейте брашното и го добавете на порции със содата и ванилията. По желание добавете и орехи. Щом всичко се хомогенизира, сипете кексовата смес в намазнена и набрашнена форма за кекс. Сложете да се пече кекса в умерено загряна фурна до готовност. Изпечения домашен кекс с прясно мляко оставете да изстине и едва след това освободете от формата. Обърнете го и го поръсете с пудра захар или го залейте с глазура.",
                "ingredients": [
                    {
                        "name": "яйца",
                        "quantity": "5 броя"
                    },
                    {
                        "name": "захар",
                        "quantity": "1 и 1/2 ч.ч."
                    },
                    {
                        "name": "прясно мляко",
                        "quantity": "1 ч. ч."
                    },
                    {
                        "name": "брашно",
                        "quantity": "3 ч. ч."
                    },
                    {
                        "name": "бакпулвер",
                        "quantity": "1 пакетче"
                    },
                    {
                        "name": "сода",
                        "quantity": "1/4 ч.л."
                    },
                    {
                        "name": "олио",
                        "quantity": "1/2 ч.ч."
                    },
                    {
                        "name": "орехи",
                        "quantity": "1 ч.ч. по желание"
                    },
                    {
                        "name": "ванилия",
                        "quantity": "1 прахче"
                    }
                ],
                "_createdOn": 1659866281433,
            },
            "43f7524a-fc29-4bd2-a05a-8052b8e8abe0": {
                "_ownerId": "35c62d76-8152-4626-8712-eeb96381bea8",
                "title": "Класическа телешка пастърма",
                "category": "Предястие",
                "preparationTime": "10 мин.",
                "neededTime": "30 мин.",
                "portions": "8",
                "image": "https://www.fermabrodilovo.com/wp-content/uploads/2020/05/DSC6115.jpg",
                "preparation": "Месото се почиства от ципи, нарязва се на около 4 см дебелина, и се поръсва обилно със сол. Слага се в гевгир да се отцеди за 24 часа. Смесваме всички подправки и овалваме много добре, за да се покрие месото. Промушва се и се суши на проветриво място, докато промени цвета си. Пастърмата може да се съхранява в хладилник до няколко месеца така приготвена. Класическата телешка пастърма е готова.",
                "ingredients": [
                    {
                        "name": "телешко месо",
                        "quantity": "2кг."
                    },
                    {
                        "name": "сол",
                        "quantity": "100гр."
                    },
                    {
                        "name": "чубрица",
                        "quantity": "на вкус"
                    },
                    {
                        "name": "червен пипер",
                        "quantity": "на вкус"
                    },
                    {
                        "name": "черен пипер",
                        "quantity": "на вкус"
                    },
                    {
                        "name": "подправки",
                        "quantity": "по избор"
                    }
                ],
                "_createdOn": 1659867513799,
            },
            "a397da6c-c1fc-47e8-97bc-942665539f8d" : {
                "title": "Пълнени червени домати с ориз и кайма",
            "category": "Основно",
            "preparationTime": "20 мин.",
            "neededTime": "40 мин.",
            "portions": "4",
            "image": "https://gotvach.bg/files/lib/400x296/domati-kapacheta.jpg",
            "preparation": "Изберете 8 средно големи домата. От страната на дръжките отрежете по едно парче и ги запазете - те ще бъдат капачетата на пълнените домати. Издълбайте с лъжичка вътрешността на доматите, като оставите месестата част. В тиган загрейте олиото и добавете нарязания на дребно лук и настъргания на ренде морков. Задушавайте 1-2 минути и прибавете каймата. Пържете докато стане на трохи, след което добавете измития и отцеден от водата ориз. Гответе още 1-2 минути. Пасирайте вътрешността, която извадихте от доматите, и нея добавете към ориза и каймата. Задушавайте още 3-4 минути. Овкусете с черен пипер, червен пипер, чубрица и сол на вкус. Разбъркайте добре и с вече готовата плънка напълнете доматите. Захлупете ги с капачетата и ги подредете в тавичката. Полейте доматите с малко олио и ги поръсете със сол. На дъното на тавичката налейте малко вода. Сложете тавичката в загрята фурна и гответе на 200 градуса за около 40 минути. Така приготвени тези пълнени червени домати с ориз и кайма са готови и може да им се насладите.",
            "ingredients": [
                {
                    "name": "домати",
                    "quantity": "8 броя"
                },
                {
                    "name": "кайма",
                    "quantity": "250гр."
                },
                {
                    "name": "ориз",
                    "quantity": "200 гр."
                },
                {
                    "name": "лук",
                    "quantity": "1 глава (малка)"
                },
                {
                    "name": "моркови",
                    "quantity": "1бр."
                },
                {
                    "name": "олио",
                    "quantity": "50 мл."
                },
                {
                    "name": "черен пипер",
                    "quantity": "1/2 ч.л."
                },
                {
                    "name": "червен пипер",
                    "quantity": "1 ч.л."
                },
                {
                    "name": "чубрица",
                    "quantity": "1 ч.л."
                },
                {
                    "name": "сол",
                    "quantity": "на вкус"
                }
            ],
            "_createdOn": 1659868038079,
            "_ownerId": "847ec027-f659-4086-8032-5173e2f9c93a",
            "_updatedOn": 1659868066149,
            },
            "2bd9d2fd-7ae0-40f2-9bf5-634e3603f0b5" : {
                "_ownerId": "35c62d76-8152-4626-8712-eeb96381bea8",
                "title": "Бърза закуска с яйца и царевица на тиган",
                "category": "Закуска",
                "preparationTime": "10 мин.",
                "neededTime": "5 мин.",
                "portions": "1",
                "image": "https://gradcontent.com/lib/400x296/corn-egg-pan1.png",
                "preparation": "В купа смесвате изцедена сладка царевица, яйцата и солта. Разбърквате. Добавяте брашното, на ситно чесън и магданоз и бъркате. Изсипвате в загрят с мазнина тиган и готвите под капак на умерено силен котлон. Махате капака, намазвате лесния омлет с кетчуп (или доматено пюре) и поръсвате с настърган кашкавал (или моцарела) и връщате капака. След като се стопи кашкавалът, сваляте от тигана и сервирате в чиния бърза закуска с яйца и царевица на тиган.",
                "ingredients": [
                    {
                        "name": "царевица от консерва ",
                        "quantity": "250 гр."
                    },
                    {
                        "name": "яйца",
                        "quantity": "2бр."
                    },
                    {
                        "name": "брашно",
                        "quantity": "50гр."
                    },
                    {
                        "name": "чесън",
                        "quantity": "няколко скилидки"
                    },
                    {
                        "name": "магданоз",
                        "quantity": "наситнен"
                    },
                    {
                        "name": "сол",
                        "quantity": "на вкус"
                    },
                    {
                        "name": "кетчуп",
                        "quantity": "или доматено пюре"
                    },
                    {
                        "name": "кашкавал",
                        "quantity": "или моцарела"
                    }
                ],
                "_createdOn": 1659988929141,
            },
            "0be9df94-8148-4e59-aa55-f96caeed4acf" : {
                "_ownerId": "35c62d76-8152-4626-8712-eeb96381bea8",
                "title": "Подлютени татарски кюфтета на скара",
                "category": "Основно",
                "preparationTime": "10 мин.",
                "neededTime": "30 мин.",
                "portions": "6",
                "image": "https://gradcontent.com/lib/400x296/tatarski-kufteta.jpg",
                "preparation": "Каймата се овкусява с всички изброени подравки, добавя се измитата и ситно нарязана на кубчета червена чушка, както и нарязаните на ситно печурки.\n\nКаймата се омесва много добре. Оставя се покрита в хладилника за няколко часа.\n\nКашкавалът се настъргва.\n\nОт каймата се оформят кюфтенца с големина около 70 гр.Върху стреч фолио с мокри ръце се разстилат кюфтетата и се слепват едно с друго, а в средата се слага от кашкавала, оформят се добре с влажни ръце, за да не изтече кашкавалът.\n\nПекат се на скара или на оптигрил, както направих аз.\n\nПоднася се със салата по избор.\n\nТатарските кюфтета на скара са много вкусни.",
                "ingredients": [
                    {
                        "name": "кайма",
                        "quantity": "1кг. (смес или свинска)"
                    },
                    {
                        "name": "чушки",
                        "quantity": "1бр. червена"
                    },
                    {
                        "name": "лук",
                        "quantity": "1 глава"
                    },
                    {
                        "name": "гъби",
                        "quantity": "4бр."
                    },
                    {
                        "name": "сол",
                        "quantity": "на вкус"
                    },
                    {
                        "name": "черен пипер",
                        "quantity": "на вкус"
                    },
                    {
                        "name": "чубрица",
                        "quantity": "на вкус"
                    },
                    {
                        "name": "кимион",
                        "quantity": "на вкус"
                    },
                    {
                        "name": "червен лют пипер",
                        "quantity": "на вкус"
                    },
                    {
                        "name": "магданоз",
                        "quantity": "на вкус"
                    },
                    {
                        "name": "кашкавал",
                        "quantity": "150гр."
                    }
                ],
                "_createdOn": 1659989364001,
            },
            "320ddc2f-7a88-4845-9aa9-e6e55359da6a" : {
                "title": "Мини руло от кайма с яйца и пресни картофи",
                "category": "Основно",
                "preparationTime": "30 мин.",
                "neededTime": "35 мин.",
                "portions": "4",
                "image": "https://recepti.gotvach.bg/files/lib/400x296/rulo-kaima-kartofi2.jpg",
                "preparation": "Нарежете лука на ситно и го прибавете към каймата.\n\nДобавете яйцето, хляба (предварително накиснат в прясното мляко), содата разтворена в киселото мляко и подправките.\n\nРазмесете хубаво и оставете каймата в хладилника за 30 минути. Пред това време обелете и нарежете на колелца картофите.\n\nРазстелете каймата върху намаслено фолио. Подредете яйцата и завийте хубаво.\n\nВ намаслена тавичка наредете един ред от картофите.\n\nПоставете соленото руло и около него, наредете останалите картофи.\n\nПоръсете с нарязания на ситно чесън, налейте малко вода и завийте с фолио. Печете на 200 градуса около 35-40 минути.\n\nКъм края на печенето свалете фолиото и допечете.\n\nМини рулото от кайма с яйца и пресни картофи е готово.",
                "ingredients": [
                    {
                        "name": "кайма",
                        "quantity": "500гр."
                    },
                    {
                        "name": "лук",
                        "quantity": "1 глава"
                    },
                    {
                        "name": "сода",
                        "quantity": "1/2 ч.л."
                    },
                    {
                        "name": "кисело мляко",
                        "quantity": "1 с.л."
                    },
                    {
                        "name": "хляб",
                        "quantity": "1 филия"
                    },
                    {
                        "name": "прясно мляко",
                        "quantity": "100 мл."
                    },
                    {
                        "name": "черен пипер",
                        "quantity": "на вкус"
                    },
                    {
                        "name": "чубрица",
                        "quantity": "на вкус"
                    },
                    {
                        "name": "сол",
                        "quantity": "на вкус"
                    },
                    {
                        "name": "универсална подправка",
                        "quantity": "подправка за кайма"
                    },
                    {
                        "name": "картофи",
                        "quantity": "500гр."
                    },
                    {
                        "name": "чесън",
                        "quantity": "2-3 скилидки"
                    },
                    {
                        "name": "яйце",
                        "quantity": "1бр"
                    }
                ],
                "_createdOn": 1659989846614,
                "_updatedOn": 1659989928280,
                "_ownerId": "847ec027-f659-4086-8032-5173e2f9c93a",
            },
            "76375087-5de3-4e09-8e9b-b0cd68c7c3c8" : {
                "title": "Вкусни домашни сиренки",
                "category": "Закуска",
                "preparationTime": "15 мин.",
                "neededTime": "25 мин.",
                "portions": "20",
                "image": "https://recepti.gotvach.bg/files/lib/400x296/sirenki-domashni.jpg",
                "preparation": "В купа се сипва киселото мляко и към него се добавя содата.\n\nРазбърква се, докато содата се активира. След това следват всички останали съставки, като сиренето е натрошено, а кашкавалът настърган.\n\nОмесва се хубаво, докато се получи не много лепкаво тесто. Тавата на фурната се застила с хартия за печене, която се намазва с олио. Фурната се включва на 180 °C.\n\nС помощта на намазани с олио ръце се взима от тестото и се оформят малки сиренки, които се подреждат в тавата. Колко бройки ще излязат, зависи от големината им. При мен излязоха 20 броя.\n\nТрябва да има разстояние между всяка от тестените закуски, защото по време на печене ще се надуят.\n\nОформените сиренки се намазват с помощта на четка с яйце, след което върху всяка се слага парченце масло. Пекат се до зачервяване- около 25-30 минути, като е добре да се наблюдават.\n\nСлед като са готови, още докато са топли, с помощта на четка се намазват с размекнато масло.\n\nИзключително вкусни са! Поднесете вкусни домашни сиренки с айрян или друга студена напитка по избор. Да ви е сладко!",
                "ingredients": [
                    {
                        "name": "брашно",
                        "quantity": "500гр."
                    },
                    {
                        "name": "сода за хляб",
                        "quantity": "1 ч.л."
                    },
                    {
                        "name": "кисело мляко",
                        "quantity": "1 кофичка"
                    },
                    {
                        "name": "сирене",
                        "quantity": "250 гр."
                    },
                    {
                        "name": "кашкавал",
                        "quantity": "150 гр."
                    },
                    {
                        "name": "сол",
                        "quantity": "на вкус"
                    },
                    {
                        "name": "олио",
                        "quantity": "1/2 к.ч."
                    },
                    {
                        "name": "яица",
                        "quantity": "1 бр"
                    },
                    {
                        "name": "яйце за намазване",
                        "quantity": "1 бр."
                    },
                    {
                        "name": "масло за намазване",
                        "quantity": "20 гр."
                    }
                ],
                "_createdOn": 1659990197800,
                "_ownerId": "847ec027-f659-4086-8032-5173e2f9c93a",
                "_updatedOn": 1659990273690,
            },
            "9d06f879-bb09-40ec-8e02-9e80c1f4e393" : {
                "_ownerId": "847ec027-f659-4086-8032-5173e2f9c93a",
                "title": "Кекс Съвършенство",
                "category": "Десерт",
                "preparationTime": "30 мин.",
                "neededTime": "60 мин.",
                "portions": "6",
                "image": "https://recepti.gotvach.bg/files/lib/400x296/keks-glazura-savarshen1.jpg",
                "preparation": "Разбиват се маслото, олиото и захарта с помощта на миксер, добавят се яйцата - едно по едно, есенцията, постепенно се добавят пресятото брашно, набухватели и какао, едновременно с мътеницата. Разбиват се с миксера на ниска степен.\n\nКрема сиренето, захарта, яйцето и есенцията се пасират до хомогенна смес.\n\nВ намаслена форма за кекс се сипва половината от кексовата смес, плънката от крема сирене пресипах в найлонов пош, за да го разпределя равномерно върху кексовата смес.\n\nОстаналата кексовата смес също пресипах в еднократен пош и внимателно добавих върху бялата смес от крема сирене.\n\nПекох на 160 градуса на вентилатор в предварително загрята фурна, приблизително за час. Проверява се с шишче.\n\nРазтопих шоколада със сметаната, разбърках до готовност и декорирах кекса отгоре.\n\nКексът Съвършенство е готов.",
                "ingredients": [
                    {
                        "name": "яйца",
                        "quantity": "3 бр."
                    },
                    {
                        "name": "захар",
                        "quantity": "300гр."
                    },
                    {
                        "name": "масло",
                        "quantity": "120 гр."
                    },
                    {
                        "name": "олио",
                        "quantity": "1/2 ч.ч"
                    },
                    {
                        "name": "ванилова есенция",
                        "quantity": "малко"
                    },
                    {
                        "name": "мътеница",
                        "quantity": "1 и 1/4 ч.ч (или прясно мляко с оцет - 1 с. л.)"
                    },
                    {
                        "name": "какао",
                        "quantity": "60 гр."
                    },
                    {
                        "name": "брашно",
                        "quantity": "280 гр."
                    },
                    {
                        "name": "бакпулвер",
                        "quantity": "12 г (бакпулвер - 10 г + 2 грама сода за хляб)"
                    },
                    {
                        "name": "сол",
                        "quantity": "1 ч.л."
                    },
                    {
                        "name": "крема сирене",
                        "quantity": "350 г (рикота - 250 г + 100 г обикновено крема сирене)"
                    },
                    {
                        "name": "пудра захар",
                        "quantity": "60 г"
                    },
                    {
                        "name": "яйце",
                        "quantity": "1 бр."
                    },
                    {
                        "name": "черен шоколад",
                        "quantity": "150 гр."
                    },
                    {
                        "name": "сладкарска сметана",
                        "quantity": "150 мл."
                    }
                ],
                "_createdOn": 1659990938202,
            },
            "77cced0b-c873-44d0-b9a3-c8e6b1e91e38" : {
                "_ownerId": "847ec027-f659-4086-8032-5173e2f9c93a",
                "title": "Обикновена бисквитена торта с шоколадов крем",
                "category": "Десерт",
                "preparationTime": "60 мин.",
                "neededTime": "30 мин.",
                "portions": "6",
                "image": "https://gradcontent.com/lib/400x296/biskvitena-torta-choco-krem.jpg",
                "preparation": "Първо приготвяме крема от млякото, какаото, натрошения шоколад. Смесват се и се загряват на котлона.\n\nПосле се добавят разбитите яйца и захарта, накрая и брашното.\n\nНапояваме бисквитите с малко прясно мляко и редим - ред бисквити, ред крем.\n\nОставяме бисквитената торта в хладилника за 1 нощ.\n\nОбикновената бисквитена торта с шоколадов крем е готова.",
                "ingredients": [
                    {
                        "name": "бисквити",
                        "quantity": "350 г обикновени"
                    },
                    {
                        "name": "шоколад",
                        "quantity": "250 гр."
                    },
                    {
                        "name": "прясно мляко",
                        "quantity": "1 литър"
                    },
                    {
                        "name": "яйца",
                        "quantity": "4 броя"
                    },
                    {
                        "name": "какао",
                        "quantity": "4 с.л."
                    },
                    {
                        "name": "брашно",
                        "quantity": "5 с.л."
                    },
                    {
                        "name": "захар",
                        "quantity": "170 гр."
                    }
                ],
                "_createdOn": 1659991962805,
            },
            "9fb5fd3b-35e2-4163-b240-b746a7db2ce1" : {
                "_ownerId": "847ec027-f659-4086-8032-5173e2f9c93a",
                "title": "Пилешки хапки със сусам",
                "category": "Предястие",
                "preparationTime": "90 мин.",
                "neededTime": "30 мин.",
                "portions": "4",
                "image": "https://imgrabo.com/pics/deals/14816371887085.jpeg",
                "preparation": "Правим пилешките гърди от соевия сос, лимоновия сок, олиото, солта и черния пипер, оставяме месото нарязано на ивици за около 1 час в нея.\n\nСлед това към него добавяме яйцата и брашното.\n\nОвалваме всяка хапка в галета и сусам и пържим в олио до златист цвят.\n\nПилешките хапки със сусам са готови.",
                "ingredients": [
                    {
                        "name": "пилешко филе",
                        "quantity": "700 гр."
                    },
                    {
                        "name": "соев сос",
                        "quantity": "5 с.л."
                    },
                    {
                        "name": "олио ",
                        "quantity": "5 с.л."
                    },
                    {
                        "name": "лимонов сок",
                        "quantity": "5 с.л."
                    },
                    {
                        "name": "брашно",
                        "quantity": "5 с.л."
                    },
                    {
                        "name": "яйца",
                        "quantity": "2 бр."
                    },
                    {
                        "name": "галета",
                        "quantity": "100 гр."
                    },
                    {
                        "name": "сусам",
                        "quantity": "100 гр."
                    },
                    {
                        "name": "сол",
                        "quantity": "на вкус"
                    },
                    {
                        "name": "черен пипер",
                        "quantity": "на вкус"
                    }
                ],
                "_createdOn": 1659993570973,
            },
            "e886d9fd-09d8-47e5-8be2-816e948c2d5a" : {
                "_ownerId": "847ec027-f659-4086-8032-5173e2f9c93a",
                "title": "Пърженица със свинско и картофи",
                "category": "Основно",
                "preparationTime": "15 мин.",
                "neededTime": "30 мин.",
                "portions": "1",
                "image": "https://gradcontent.com/lib/400x296/parjeno-svinsko-kartofi-luk.jpg",
                "preparation": "Нарежете свинския врат на дребни парчета, картофките също се режат на ситно. Обелете лука, нарежете го на средно едри парчета, чушките на лентички.\n\nВ тиган се загрява олио, запържете хапките месо, поръсени със сол и черен пипер.\n\nКогато побелее добавете лука, чушка и картофи.\n\nСипете малко вода и гответе до готовност на месото.\n\nКогато остане на мазнина овкусете с падправка за картофи, розмарин и магданоз.\n\nЧудесна пърженица както за мезе, така и за похапване!\n\nОтворете една студена бира и хапнете пърженото свинско.\n\nПърженицата със свинско и картофи е готова.",
                "ingredients": [
                    {
                        "name": "картофи",
                        "quantity": "500 гр."
                    },
                    {
                        "name": "Свински врат",
                        "quantity": "200 гр."
                    },
                    {
                        "name": "олио",
                        "quantity": "5 - 6 с.л."
                    },
                    {
                        "name": "сол",
                        "quantity": "на вкус"
                    },
                    {
                        "name": "черен пипер",
                        "quantity": "на вкус"
                    },
                    {
                        "name": "лук",
                        "quantity": "1 глава"
                    },
                    {
                        "name": "чушки",
                        "quantity": "3 ленти"
                    },
                    {
                        "name": "подправка",
                        "quantity": "за картофи"
                    },
                    {
                        "name": "росмарин",
                        "quantity": "на вкус"
                    },
                    {
                        "name": "магданоз",
                        "quantity": "на вкус"
                    }
                ],
                "_createdOn": 1659994045856,
            },
            "d7fc429a-a4a9-4fb3-8063-72274a1567c4" : {
                "_ownerId": "847ec027-f659-4086-8032-5173e2f9c93a",
                "title": "Мексиканско гуакамоле",
                "category": "Салата",
                "preparationTime": "10 мин.",
                "neededTime": "10 мин",
                "portions": "2",
                "image": "https://gradcontent.com/lib/400x296/guacamole.jpg",
                "preparation": "Почистеното авокадо се нарязва на кубчета и полива със сока от половин лайм.\n\nС помощта на вилица се намачква до кремобразна консистенция.\n\nКъм него се прибавя ситно нарязаният червен лук, домат илюта чушка.\n\nГуакамолето се овкусява със сол, смлян черен пипер и зехтин.\n\nРазбърква се хубаво и сервира с царевичен чипс.\n\nМексиканското гуакамоле е готово.",
                "ingredients": [
                    {
                        "name": "авокадо",
                        "quantity": "2 бр."
                    },
                    {
                        "name": "лайм",
                        "quantity": "сок от половин лайм"
                    },
                    {
                        "name": "червен лук",
                        "quantity": "1 малка глава"
                    },
                    {
                        "name": "домати",
                        "quantity": "1 бр."
                    },
                    {
                        "name": "люти чушки",
                        "quantity": "1 бр."
                    },
                    {
                        "name": "кашерна сол",
                        "quantity": "на вкус"
                    },
                    {
                        "name": "зехтин",
                        "quantity": "1 с.л."
                    },
                    {
                        "name": "черен пипер",
                        "quantity": "2 щипки"
                    },
                    {
                        "name": "кориандър",
                        "quantity": "или магданоз"
                    }
                ],
                "_createdOn": 1659994349348,
            },
            "b9c93ec7-a157-4379-8643-b1a0052368e9" : {
                "_ownerId": "35c62d76-8152-4626-8712-eeb96381bea8",
                "title": "Вкусна доматена супа по мамина рецепта",
                "category": "Супа",
                "preparationTime": "10 мин.",
                "neededTime": "45 мин.",
                "portions": "8",
                "image": "https://gradcontent.com/lib/400x296/domatenasupababa23.jpg",
                "preparation": "Лукът се обелва и се реже на много ситно. Чесънът се бели и се реже на филийки.\n\nМорковите се белят и се режат на дребни кубчета. Чушките се почистват от семките и се режат на дребни кубчета.\n\nВ дълбока тенджера се сгорещява олиото и в него се запържват първо лукът и чесънът.\n\nСлед това се добавят и останалите зеленчуци и се оставят хубаво да се задушат.\n\nПрез това време доматите се почистват от дупетата, измиват се и се настъргват на едро ренде в голяма купа.\n\nСлед като зеленчуците са омекнали, към тях се добавят настърганите домати и тези от консерва. Всяка консерва се пълни с топла вода, за да се обере каквото е останало, и се добавя към супата.\n\nСлагат се подправките и доматената супа се оставя да къкри на тих огън за около 45 минути.\n\nСлед като е готова, се оставя да изстине, пасира се и към нея се добавя нарязаният на ситно магданоз, като се оставя малко за поръсване при сервиране.\n\nМожете да сервирате доматената супа с домашно направени крутони. Да ви е сладко!\n\nВкусната доматена супа по мамина рецепта е готова.",
                "ingredients": [
                    {
                        "name": "домати",
                        "quantity": "1500 г"
                    },
                    {
                        "name": "домати консерви /по 400 г/ ",
                        "quantity": "2 бр. обелени и нарязани на кубчета"
                    },
                    {
                        "name": "лук",
                        "quantity": "1 глава"
                    },
                    {
                        "name": "моркови",
                        "quantity": "2 бр."
                    },
                    {
                        "name": "чушки зелени",
                        "quantity": "2 бр."
                    },
                    {
                        "name": "чушки червени",
                        "quantity": "2 бр."
                    },
                    {
                        "name": "чесън",
                        "quantity": "4 скилидки"
                    },
                    {
                        "name": "подправки",
                        "quantity": "сол, захар, черен пипер, риган, мащерка, чубрица"
                    },
                    {
                        "name": "олио",
                        "quantity": "50 мл."
                    },
                    {
                        "name": "магданоз",
                        "quantity": "1 връзка"
                    }
                ],
                "_createdOn": 1659995467719,
            },
            "f4aa3418-1cd2-4b03-a5ce-f61601467db3" : {
                "_ownerId": "35c62d76-8152-4626-8712-eeb96381bea8",
                "title": "Боровинков чиа пудинг",
                "category": "Десерт",
                "preparationTime": "5 мин.",
                "neededTime": "5 мин.",
                "portions": "2",
                "image": "https://recepti.gotvach.bg/files/lib/500x350/chia-puding-s-matcha.jpg",
                "preparation": "В по-голям съд се изсипват чиа семената.\n\nНалива се прясното мляко, ванилията и се прибавя киселото мляко.\n\nИзсипват се замразените боровинки и се разбърква добре.\n\nПрибира се в хладилника за няколко часа или за през нощта.\n\nНа този етап може да изглежда много течно, но чиа семената абсорбират течност до 12 пъти своето тегло, като се надуват и образуват балонче около себе си с гелообразна текстура.\n\nНа другия ден пудингът с чиа се разбърква, разпределя се в чашки и е готов за сервиране.\n\nДа ви е вкусно с този полезен десерт - боровинков чиа пудинг.",
                "ingredients": [
                    {
                        "name": "чиа семена",
                        "quantity": "6 с.л."
                    },
                    {
                        "name": "кисело мляко",
                        "quantity": "½ ч.ч. (е ¼ обикновено и ¼ плодово)"
                    },
                    {
                        "name": "растително мляко",
                        "quantity": "1 ½ ч.ч"
                    },
                    {
                        "name": "ванилов екстракт",
                        "quantity": "1 ч.л."
                    },
                    {
                        "name": "боровинки",
                        "quantity": "150 грама, замразени"
                    }
                ],
                "_createdOn": 1659995680506,
            },
            "b42b3cf6-c5f8-4a3b-926b-1e045cf6d1c8" : {
                "_ownerId": "35c62d76-8152-4626-8712-eeb96381bea8",
                "title": "Зелена салата с пушена сьомга и синьо сирене",
                "category": "Салата",
                "preparationTime": "30 мин.",
                "neededTime": "30 мин.",
                "portions": "4",
                "image": "https://gradcontent.com/lib/400x296/salata-qgodi-sirensinjo.jpg",
                "preparation": "Измиваме и накъсваме марулите на малки късчета, може за целта да се използва също така и айсберг.\n\nНе използваме нож за марулята, за да останат с витамините си повече в зеленчука, казват, че когато се реже с нож, витамините се губят.\n\nВзимам един малък буркан, слагаме вътре зехтин, Балсамико, сол и нарязан на ситно копър, разбъркваме хубаво соса.\n\nИзсипваме отгоре на марулята, след което разбъркваме хубаво и сервираме марулята по чиниите отгоре, режим на тънки ленти пушената сьомга, тръгваме синьо сирене отгоре и поставяме нарязаните на кубчета черен хляб с 5 вида семена.\n\nМоже да препечем хляба на грил тиган, мисля че ще се получи още по-добре.\n\nТази рецепта за зелена салата е за тези, които обичат да опитват нови полезни и вкусни неща.\n\nЗелена салата с пушена сьомга и синьо сирене ще се хареса на всеки.",
                "ingredients": [
                    {
                        "name": "пушена сьомга",
                        "quantity": "100 г"
                    },
                    {
                        "name": "маруля =",
                        "quantity": "1 средна глава ( може и айсберг )"
                    },
                    {
                        "name": "синьо сирене",
                        "quantity": "50 г"
                    },
                    {
                        "name": "зехтин",
                        "quantity": "2 с.л."
                    },
                    {
                        "name": "хималайска сол",
                        "quantity": "1 ч.л."
                    },
                    {
                        "name": "балсамико",
                        "quantity": "2 с.л."
                    },
                    {
                        "name": "копър",
                        "quantity": "2 щипки пресен"
                    },
                    {
                        "name": "черен хляб",
                        "quantity": "2 филийки с 2 вида семена"
                    }
                ],
                "_createdOn": 1659996003331,
            },
            "0c670935-5eb9-49c7-9aa4-7a4a2c50d809" : {
                "_ownerId": "35c62d76-8152-4626-8712-eeb96381bea8",
                "title": "Чипс от рачешки рулца в еър фрайър",
                "category": "Аламинут",
                "preparationTime": "10 мин.",
                "neededTime": "15 мин.",
                "portions": "1",
                "image": "https://gradcontent.com/lib/400x296/crab-stick-chips.jpg",
                "preparation": "Рулцата от раци се размразяват. Всяко парче се нарязва по дължина на две половинки и след това всяка половинка се разделя още веднъж.\n\nВ купа се поставят всички нарязани парченца рачешки рулца.\n\nПодправят се с по ваш вкус и се налива олиото.\n\nРазбъркват се хубаво. Оставят се половин час, като периодично се разбъркват.\n\nСлед това това апетитно мезе се поставят в еър фрайър, да се пекат на 200 °C за около 15 минути.\n\nЧипс от рачешки рулца в еър фрайър е идеален за бира с приятели.",
                "ingredients": [
                    {
                        "name": "рулца от раци",
                        "quantity": "250 г"
                    },
                    {
                        "name": "олио",
                        "quantity": "2 с.л."
                    },
                    {
                        "name": "черен пипер",
                        "quantity": "на вкус"
                    },
                    {
                        "name": "кориандър",
                        "quantity": "на вкус"
                    },
                    {
                        "name": "сушен лук",
                        "quantity": "на вкус"
                    },
                    {
                        "name": "девисил",
                        "quantity": "на вкус"
                    },
                    {
                        "name": "сол",
                        "quantity": "на вкус"
                    }
                ],
                "_createdOn": 1660306827006,
            },
            "d292126b-876b-4965-9ea5-96f3f663487c" : {
                "title": "Пилешки бутчета с бамя и картофи на фурна",
                "category": "Основно",
                "preparationTime": "15 мин.",
                "neededTime": "120 мин",
                "portions": "6",
                "image": "https://recepti.gotvach.bg/files/lib/400x296/butcheta-bamq.jpg",
                "preparation": "Нарежете зеленчуците, както ви харесва.\n\nЗа кратко „запържете“ бутчетата в зехтина. След това ги извадете от мазнината и на тяхно място задушете лука, морковите, чушките до омекване.\n\nДобавете картофите и подправките.\n\nРазбъркайте още 2-3 минути и сипете част от доматите, нарязани на ситно или смлени.\n\nПрехвърлете в тава, наредете бутчетата и бамята, както е цяла, домати на кръгчета.\n\nНалейте ½ ч.ч. вода или бяло вино по желание.\n\nПокрийте пилешкото със зеленчуци плътно с алуминиево фолио и печете 2 часа на 180 °C с вентилатор.\n\nПоловин час преди да изтече времето, отстранете фолиото и печете пилешките бутчета до зачервяване!\n\nПилешки бутчета с бамя и картофи на фурна - да ви е много вкусно!",
                "ingredients": [
                    {
                        "name": "пилешки бутчета",
                        "quantity": "500 г"
                    },
                    {
                        "name": "лук",
                        "quantity": "120 гр."
                    },
                    {
                        "name": "бамя",
                        "quantity": "400 гр."
                    },
                    {
                        "name": "домати",
                        "quantity": "320 гр."
                    },
                    {
                        "name": "картофи",
                        "quantity": "600 гр."
                    },
                    {
                        "name": "чушки",
                        "quantity": "270 гр."
                    },
                    {
                        "name": "моркови",
                        "quantity": "130 гр."
                    },
                    {
                        "name": "зехтин",
                        "quantity": "20 гр."
                    },
                    {
                        "name": "червен пипер",
                        "quantity": "1 ч.л."
                    },
                    {
                        "name": "пушен червен пипер",
                        "quantity": "1 ч.л."
                    },
                    {
                        "name": "чесън на прах",
                        "quantity": "на вкус"
                    },
                    {
                        "name": "дафинов лиск",
                        "quantity": "на вкус"
                    },
                    {
                        "name": "черен пипер",
                        "quantity": "на вкус"
                    },
                    {
                        "name": "сол",
                        "quantity": "на вкус"
                    }
                ],
                "_createdOn": 1660307447763,
                "_updatedOn": 1660307488787,
                "_ownerId": "847ec027-f659-4086-8032-5173e2f9c93a",
            }
        },
        comments: [
            {
                "_ownerId": "35c62d76-8152-4626-8712-eeb96381bea8",
                "text": "super",
                "recipieId": "136777f5-3277-42ad-b874-76d043b069cb",
                "_createdOn": 1659284933458,
                "_id": "8b010033-c0e1-4e9e-8890-107c8e5be173"
            },
            {
                "_ownerId": "847ec027-f659-4086-8032-5173e2f9c93a",
                "text": "много добра рецепта",
                "recipieId": "136777f5-3277-42ad-b874-76d043b069cb",
                "_createdOn": 1659286614200,
                "_id": "3312681a-30d0-49ee-b101-0c1016b6132d"
            },
            {
                "_ownerId": "35c62d76-8152-4626-8712-eeb96381bea8",
                "text": "обичам я",
                "recipieId": "136777f5-3277-42ad-b874-76d043b069cb",
                "_createdOn": 1659286683558,
                "_id": "c76fd1db-7366-48fc-a545-3f17fe83892d"
            },
            {
                "_ownerId": "35c62d76-8152-4626-8712-eeb96381bea8",
                "text": "тази рецепта е много подходяща за пролетно-летния сезон",
                "recipieId": "136777f5-3277-42ad-b874-76d043b069cb",
                "_createdOn": 1659287759817,
                "_id": "8e4faf3a-5a3a-41c5-a91a-a472eac24c6b"
            },
            {
                "_ownerId": "847ec027-f659-4086-8032-5173e2f9c93a",
                "text": "super",
                "recipieId": "ff436770-76c5-40e2-b231-77409eda7a61",
                "_createdOn": 1659284933458,
                "_id": "8b010033-c0e1-4e9e-8890-107c8e5be173"
            },
            {
                "_ownerId": "35c62d76-8152-4626-8712-eeb96381bea8",
                "text": "много добра рецепта",
                "recipieId": "ff436770-76c5-40e2-b231-77409eda7a61",
                "_createdOn": 1659286614200,
                "_id": "3312681a-30d0-49ee-b101-0c1016b6132d"
            },
            {
                "_ownerId": "35c62d76-8152-4626-8712-eeb96381bea8",
                "text": "обичам я",
                "recipieId": "1840a313-225c-416a-817a-9954d4609f7c",
                "_createdOn": 1659286683558,
                "_id": "c76fd1db-7366-48fc-a545-3f17fe83892d"
            },
            {
                "_ownerId": "847ec027-f659-4086-8032-5173e2f9c93a",
                "text": "тази рецепта е много подходяща за пролетно-летния сезон",
                "recipieId": "1840a313-225c-416a-817a-9954d4609f7c",
                "_createdOn": 1659287759817,
                "_id": "8e4faf3a-5a3a-41c5-a91a-a472eac24c6b"
            },
            {
                "_ownerId": "35c62d76-8152-4626-8712-eeb96381bea8",
                "recipieId": "3f72358f-c3ad-4f8c-831c-a7fa33cdadde",
                "text": "страхотно тараторът е мое любимо ястие",
                "_createdOn": 1659780042310,
                "_id": "e9b7ba25-3161-4447-8922-9964c5353e2d"
            }
        ],
        likes: [
            {
                "_ownerId": "847ec027-f659-4086-8032-5173e2f9c93a",
                "recipieId": "136777f5-3277-42ad-b874-76d043b069cb",
                "_createdOn": 1659878485965,
                "_id": "61c18d3b-4920-41a5-bd47-f79ba777eb80"
            },
            {
                "_ownerId": "847ec027-f659-4086-8032-5173e2f9c93a",
                "recipieId": "1840a313-225c-416a-817a-9954d4609f7c",
                "_createdOn": 1659878589048,
                "_id": "cf2f4c63-f4b8-4597-9486-ad323f77be26"
            },
            {
                "_ownerId": "847ec027-f659-4086-8032-5173e2f9c93a",
                "recipieId": "ff436770-76c5-40e2-b231-77409eda7a61",
                "_createdOn": 1659878626480,
                "_id": "6c0f1d2a-43e2-48d9-8dbf-19fee1f444f1"
            }
        ],
        favorites: [
            {
                "_ownerId": "35c62d76-8152-4626-8712-eeb96381bea8",
                "recipieId": "1840a313-225c-416a-817a-9954d4609f7c",
                "_createdOn": 1660068995540,
                "_id": "e72f40c6-0066-4056-af33-9a3340263d12"
            },
            {
                "_ownerId": "35c62d76-8152-4626-8712-eeb96381bea8",
                "recipieId": "8bdd1772-527a-41c1-acee-2cd72e02d905",
                "_createdOn": 1660069010935,
                "_id": "d70dca86-695e-41da-ab81-8b7f74deec9a"
            },
            {
                "_ownerId": "35c62d76-8152-4626-8712-eeb96381bea8",
                "recipieId": "b9c93ec7-a157-4379-8643-b1a0052368e9",
                "_createdOn": 1660069026969,
                "_id": "2ccb6f64-d9b3-4831-a7c7-f9582582b080"
            },
            {
                "_ownerId": "35c62d76-8152-4626-8712-eeb96381bea8",
                "recipieId": "3f72358f-c3ad-4f8c-831c-a7fa33cdadde",
                "_createdOn": 1660070047921,
                "_id": "6bc7e475-8042-47d5-9766-2fa89ed293da"
            },
            {
                "_ownerId": "847ec027-f659-4086-8032-5173e2f9c93a",
                "recipieId": "3f72358f-c3ad-4f8c-831c-a7fa33cdadde",
                "_createdOn": 1660070047921,
                "_id": "6bc7e475-8042-47d5-9766-2fa89ed293da"
            }
        ],
    };
    var rules$1 = {
        users: {
            ".create": false,
            ".read": [
                "Owner"
            ],
            ".update": false,
            ".delete": false
        }
    };
    var settings = {
        identity: identity,
        protectedData: protectedData,
        seedData: seedData,
        rules: rules$1
    };

    const plugins = [
        storage(settings),
        auth(settings),
        util$2(),
        rules(settings)
    ];

    const server = http__default['default'].createServer(requestHandler(plugins, services));

    const port = 3030;
    server.listen(port);
    console.log(`Server started on port ${port}. You can make requests to http://localhost:${port}/`);
    console.log(`Admin panel located at http://localhost:${port}/admin`);

    var softuniPracticeServer = {

    };

    return softuniPracticeServer;

})));
