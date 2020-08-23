class HistoryRoute {
    constructor(name,current,params,query,from,to){
        this.current = {
            fullPath: "/",
            hash: "",
            matched:[],
            meta: {},
            name: "",
            params: {},
            path: "/",
            query: ""
        }

    }
}
var cbs = []
function extractUpdateRoutesFn(updatedRoutes) {
    var fns = []
    updatedRoutes&&updatedRoutes.forEach(updatedRoute=>{
        let components = updatedRoute.components
        for(let [index,item] of Object.entries(components)){
            if(typeof  item !=='function'){
                var def = Vue.extend(item);
                var instance = updatedRoute.instances[index]
                var f = def.options['beforeRouteUpdate']
                if(f){
                    fns.push(f.bind(instance))
                }

            }
        }
    })
    return fns
}

function registerInstance(vm, callVal) {
    var i = vm.$options._parentVnode;
    if (i){
        i= i.data
        if (i ) {
            i = i.registerInstance
            if(i){
                i(vm, callVal);
            }
        }
    }
};

function extractLeaveRoutesFn(deviatedRoutes) {
    var fns = []
    deviatedRoutes&&deviatedRoutes.forEach(deviatedRoute=>{
        let components = deviatedRoute.components
        for(let [index,item] of Object.entries(components)){
            if(typeof  item !=='function'){
                var def = Vue.extend(item);
                var instance = deviatedRoute.instances[index]
                var f = def.options['beforeRouteLeave']
                if(f){
                    fns.push(f.bind(instance))
                }

            }
        }
    })
    return fns
}


function extractEnterGuards(activatedRoutes, postEnterCbs) {
    var fns = []
    activatedRoutes&&activatedRoutes.forEach(activatedRoute=>{
        // debugger
        let components = activatedRoute.components
        for(let [index,item] of Object.entries(components)){
            if(typeof  item !=='function'){
                var def = Vue.extend(item);
                var instance = activatedRoute.instances[index]
                var f = def.options['beforeRouteEnter']
                if(f){
                    var f1 = function(to,from,next){
                        f(to,from,function (cb) {
                            if(typeof cb === "function"){
                                postEnterCbs.push(cb)
                            }
                        })
                        next()

                    }
                    fns.push(f1)
                }
            }
        }
    })
    return fns
}


function extractBeforeEach(router) {
    return router.beforeEach || function () {

    }
}



function extractAfterEach(router) {
    return router.afterEach || function () {

    }
}

class VueRouter{
    constructor(options){
        this.pathList = []
        this.nameMap = Object.create(null)
        this.pathMap = Object.create(null)
        this.mode = options.mode||"hash"
        this.routes = options.routes || []
        this.createMap(this.pathList,this.nameMap,this.pathMap,this.routes)

        this.history = new HistoryRoute()
        this.beforeHooks = []
        this.resolveHooks = []
        this.afterHooks = []
        this.init()
    }
    init(){
        if(this.mode == 'hash'){
            // location.hash?'':this.history.current = '/'
            window.addEventListener("load",(event)=>{
                let obj = formatPathObj(location.hash)
                // debugger
                this.push(obj)
            })
            window.addEventListener("hashchange",(event)=>{
                console.log(this,this.toRoute.fullPath)
                let h = this.toRoute.fullPath
                if(!h.startsWith('#')){
                    h = "#"+h
                }
                if(!h===location.hash) {
                    let obj = formatPathObj(location.hash)
                    this.push(obj)
                }


            })
        }else if(this.mode == 'history'){
            // location.pathname? '':location.pathname = "/";
            window.addEventListener('load',(event)=>{
                // // debugger
                // this.history.current = location.pathname
            })
            window.addEventListener("popstate",(event)=>{

                // this.history.current = location.pathname
            })
        }
    }
    createMap(pathList,nameMap,pathMap,routes){
        routes.forEach((route)=>{
            this.addRouteRecord(pathList, pathMap, nameMap, route)
        })
        // // debugger
        // console.log(pathList,nameMap,pathMap)
    }
    /*
    * @match函数是根据参数lacation得到对应的record
    *
    */
    match(routeObj){
        // console.log("routeObj",routeObj)
        // console.log( this.pathList,this.pathMap,this.nameMap)
        if(routeObj.path){
            //如果是path的话会从pathmap里面选择
            let record = this.pathMap[routeObj.path]
            if(!record){
                for(let o of Object.values(this.pathMap)){
                    // debugger
                    var a = o.regey.test(routeObj.path)
                    // console.log(a)
                    if(a) {
                        record = o
                        // record.path = routeObj.path
                        break
                    }
                }
            }
            record.path2 = routeObj.path
            let currentRoute = this.createRoute(record)
            delete record.path2
            return currentRoute
        }else if(routeObj.name){
            let name = routeObj.name
            let record = this.nameMap[name]
            let path = record.path
            let regexp = record.regex
            let params = routeObj.params
            let m = path.match(regexp)
            if(m){
                // console.log(m)
                m.slice(1).forEach(item=>{
                    path = path.replace(item,(args)=>{
                        let arg= args.slice(1)
                        return params[arg]
                    })
                })
            }
            let queryStr=''
            let queryKeys = routeObj.query&&Object.keys(routeObj.query)
            if(queryKeys&&queryKeys.length){
                for(let key of queryKeys){
                    let value = routeObj.query[key]
                    queryStr += `${key}=${value}&`
                }
                queryStr = '?'+queryStr
            }
            path = this.mode ==='hash'? '#'+path+queryStr:path+queryStr
            let currentRoute ={
                name: routeObj.name || (record && record.name),
                meta: (record && record.meta) || {},
                path: record.path || '/',
                hash: record.hash || '',
                query: queryStr,
                params: routeObj.params || {},
                fullPath: path,
                matched: record ? this.formatMatch(record) : []
            };
            return currentRoute
        }else{
            throw new Error("")
        }
    }
    createRoute(location){
        var route = {
            name: location.name ,
            meta: (location && location.meta) || {},
            path: location.path2 || '/',
            hash: location.hash || '',
            // query: query,
            params: location.params || {},
            fullPath:location.path2,
            matched: location ? this.formatMatch(location) : []
        };
        return route

    }
    formatMatch(record){
        let list = []
        list.push(record)
        while(record.parent){
            record = record.parent
            list.push(record)

        }
        list.reverse()
        return list
    }
    addRouteRecord(pathList, pathMap, nameMap, route,parent,matchAs){
        let path =route.path
        let regExp = pathToRegexp(path)
        let record = {
            path: normalizePath(route.path,parent&&parent.path),
            regex: pathToRegexp(route.path).regN,
            regey: pathToRegexp(route.path).regM,
            components: route.components || { default: route.component },
            instances: {},
            name: route.name,
            parent: parent,
            matchAs: matchAs,
            redirect: route.redirect,
            beforeEnter: route.beforeEnter,
            meta: route.meta || {},
        }
        this.pathList.push(record.path)
        if(route.name){
            if(!this.nameMap[name]){
                this.nameMap[route.name] = record
            }
        }
        if(!this.pathMap[record.path]){
            this.pathMap[record.path] = record
        }

        if(route.children){
            var childRoutes = route.children
            childRoutes.forEach((childRoute)=>{
                if(matchAs) matchAs = matchAs+'\/'+childRoute.path
                this.addRouteRecord(pathList, pathMap, nameMap, childRoute,record,matchAs)
            })
        }
        if(route.alias){
            let alias = route.alias
            alias = Array.isArray(alias)?alias:[alias]
            alias.forEach((alia)=>{
                let aliaRoute = {
                    path:alia,
                    children:route.children
                }
                let matchAs = route.path
                this.addRouteRecord(pathList, pathMap, nameMap, aliaRoute,parent,matchAs)
            })
        }

    }
}

function registerHooks(list,fn){
    list.push(fn)
    return function () {
        var i = list.indexOf(fn)
        if(i>-1) list.splice(i,1)
    }
}

function resolveAsyncComponents(matched) {
    return function (to, from, next) {
        var hasAsync = false;
        var pending = 0;
        var error = null;
        matched&&matched.forEach((m)=>{
            let def = m.components
            let match = m
            let key = 'default'
            if(typeof def[key] === 'function'&& def.cid === undefined){
                hasAsync = true
                pending++

                function once(fn) {
                    let called = false
                    return function () {
                        var args = [], len = arguments.length;
                        while ( len-- ) args[ len ] = arguments[ len ];
                        if(called) return
                        called = true
                        return fn.apply(this,args)
                    }
                }
                function component(resolve) {
                    // resolve,fn.apply之类的
                    return new Promise(function(resolve) { resolve(); })
                        .then(function() {
                            var __WEBPACK_AMD_REQUIRE_ARRAY__ = [__webpack_require__("./src/views/About.vue")];
                            ((resolve).apply(null, __WEBPACK_AMD_REQUIRE_ARRAY__));}
                            .bind(this)).catch(__webpack_require__.oe);
                }
                var resolve = once(function (resolvedDef) {
                    var d = def.resolved = typeof resolvedDef['default'] === 'function'
                        ? resolvedDef['default'] : Vue.extend(resolvedDef['default']);
                    match.components[key] = resolvedDef['default'];
                    pending--;
                    if (pending <= 0) {
                        next();
                    }
                })

                var reject = once(function (resolvedDef) {
                    // console.log(resolvedDef)
                })

                var res
                try {
                    res = def['default'](resolve, reject);
                }catch (e) {
                    reject(e);
                }

                if (res) {
                    if (typeof res.then === 'function') {
                        res.then(resolve, reject);
                    } else {
                        // new syntax in Vue 2.3
                        var comp = res.component;
                        if (comp && typeof comp.then === 'function') {
                            comp.then(resolve, reject);
                        }
                    }
                }
                next();
            }

        })
        if (!hasAsync) { next(); }
    }

}

function formatPathObj(hash){
    let hashPath = hash.slice(1).split('?')[0]
    let queryStr = hash.slice(1).split('?')[1]
    if(queryStr){
        var o = {}
        var arr = queryStr.split("&")
        for(let item of arr){
            let key = item.split("=")[0]
            let value = item.split("=")[1]
            if(key)
                o[key] = value
        }
    }
    return {path:hashPath,query:o}
}

VueRouter.prototype.beforeEach = function(fn){
    // debugger
    registerHooks(this.beforeHooks,fn)
}

VueRouter.prototype.beforeResolve = function(fn){
    registerHooks(this.resolveHooks,fn)
}

VueRouter.prototype.afterEach = function(fn){
    registerHooks(this.afterHooks,fn)
}

VueRouter.prototype.push =function (routeObj){
    // debugger
    this.transitionTo(routeObj, (route) =>{
        // console.log(route,window.history)
        if(this.mode==="history"){
            window.history.pushState({},null,route.fullPath)
        }else if(this.mode ==='hash'){
            // debugger
            this.history.current = route
            window.location.hash = route.fullPath
        }
    },function () {
        // console.log("onAbort")
    })
}

VueRouter.prototype.transitionTo =function (routeObj,onComplete,onAbort){
    //get record by match location
    //confirm it is not the same record
    //execute ConfirmTransitionTo function
    this.fromRoute = this.history.current
    this.toRoute = this.match(routeObj)
    // function updateRoute(route){
    //     this.current = route;
    //     // this.cb && this.cb(route);
    // }

    this.ConfirmTransitionTo(this.toRoute, (route)=> {
        // debugger
        // console.log(route)
        onComplete(route)
        this.afterHooks.forEach(cb=>cb())
        cbs.forEach(cb=>cb())
        cbs.length = 0
    },onAbort)
}

VueRouter.prototype.ConfirmTransitionTo = function (route,onComplete,onAbort){
    //下面这段代码可以提取成一个函数，resolveQueue
    // debugger
    // console.log(this)
    if(!this.toRoute||!this.fromRoute||this.toRoute===this.fromRoute) return
    let maxLength = Math.max(this.fromRoute.matched.length,this.toRoute.matched.length)
    var i
    for(i =0;i<maxLength;i++){
        if(this.fromRoute.matched[i]!==this.toRoute.matched[i]){
            break
        }
    }
    let activatedRoutes  = this.toRoute.matched&&this.toRoute.matched.slice(i)
    let deviatedRoutes  = this.fromRoute.matched&&this.fromRoute.matched.slice(i)
    let updatedRoutes = this.toRoute.matched&&this.toRoute.matched.slice(0,i)
    var fromRouteIndex = this.fromRoute.matched.length - 1;
    var toCurrentIndex = this.toRoute.matched.length - 1;

    //官方源码这里定义一个abort函数，并且在跳转之前，判断一下两个路由是不是路径一样而且路由也一样，
    //如果是的话就abort，不再往下执行
    //这里先忽略不写

    /*
    * 提取失活和激活的组件
    * */
    let transitionRoutes ={
        activatedRoutes:activatedRoutes,
        deviatedRoutes:deviatedRoutes,
        updatedRoutes:updatedRoutes
    }
    let self = this
    let queue = [].concat([
        ...extractLeaveRoutesFn(transitionRoutes.deviatedRoutes),//在失活的组件里调用离开守卫
        ...extractUpdateRoutesFn(transitionRoutes.updatedRoutes),
        ...this.beforeHooks,///调用全局的beforeEach守卫,
        ...transitionRoutes.activatedRoutes.map(activatedRoute=>activatedRoute.beforeEnter).filter(fn=>fn),//调用路由组件里面beforeEnter
        resolveAsyncComponents(transitionRoutes.activatedRoutes)
    ])
    //这时候fromRoute还是目前的route，不是toRoute
    this.pending = this.fromRoute
    var iterator = (hook,next)=>{
        try{
            hook(this.fromRoute,this.toRoute, (to)=> {
                //前面那些hooks执行完就执行以下代码
                // console.log(to)
                if (
                    typeof to === 'string' ||
                    (typeof to === 'object' &&
                        (typeof to.path === 'string' || typeof to.name === 'string'))
                ) {
                    onComplete(this.toRoute)
                }else{
                    // debugger
                    next(to)
                    // onComplete(this.toRoute)
                }
            })
        }catch (e) {
            // console.log(e)
        }
    }

    runQueue(queue,iterator, () =>{
        //上面的hook执行完了
        var queue = extractEnterGuards(transitionRoutes.activatedRoutes,cbs).concat(this.resolveHooks)
        runQueue(queue,iterator, ()=> {
            // debugger
            // console.log(cbs)
            this.pending = null;
            // debugger
            onComplete(this.toRoute);//这里用来pushstate实现跳转
        })
    })


    function runQueue(queue, fn, cb) {
        // debugger
        var step = function(index){
            if(index>=queue.length){
                cb()
            }else{
                if(queue[index]){
                    fn(queue[index],function () {
                        step(index+1)
                    })
                }else{
                    step(index+1)
                }
            }
        }
        step(0)
    }
}
function pathToRegexp(path){
    path = path&&path.split("?")[0]
    // /about/:child/grandchild
    let reg = /(?:\:)([a-zA-Z0-9-_]+)/gi
    let regX = path
    let regY = path
    let m = reg.exec(regX)
    let keys = []
    while(m){
        // console.log(m)
        keys.push(m[1])
        regX = regX.replace(m[0],'(\\:[a-zA-Z0-9-_]+)')
        regY = regY.replace(m[0],'([a-zA-Z0-9-_]+)')
        m = reg.exec(regX)
    }
    regX +='(\/)?$'
    regY +='(\/)?$'
    let regN = new RegExp(regX)
    let regM = new  RegExp(regY)
    reg.keys = keys
    return {regN,regM}
}

function normalizePath(path,parentPath){
    if(path.startsWith("\/")){
        return path
    }else{
        return cleanPath((parentPath?parentPath:'')+"\/"+path)
    }
}

function cleanPath(path){
    var formatStr = path.replace(/\/\//g,'\/')
    return formatStr
}
var Vue
VueRouter.install = function(v){
    Vue = v
    var self = this
    // console.log(this.$router)
    Vue.component('router-link',{
        props:{
            to:{
                type:[Object,String],
                require:true
            },
            replace:{
                type:Boolean,
                default:false
            },
            tag:{
                type:String,
                default:'a'
            }
        },

        render(h) {
            return h(this.tag,{
                on:{
                    "click": () => {
                        // console.log(this.to)
                        let obj
                        if(typeof this.to === "string"){
                            obj = {
                                path:this.mode === "hash"?'#/'+this.to:this.to
                            }

                        }else if(typeof this.to === "object"){
                            if(this.to.path){
                                this.to.path = this.mode === "hash"?'#/'+this.to:this.to
                            }
                        }
                        this.$router.push(obj||this.to)
                    }
                }
            },this.$slots.default)

        }
    })


    Vue.component('router-view',{
        name: 'router-view',
        functional: true,
        props:{
            name:{
                type:String,
                default:'default'
            }
        },
        render(h,ref){
            var data = ref.data
            var name = ref.name||'default'
            var children = ref.children;
            var parent = ref.parent;
            var route = parent.$route;
            // console.log(ref.parent._root)
            if(!route){
                // console.log(route)
                return
            }

            let matched = route.matched
            if(!matched) return

            //执行那一系列的钩子

            data.dataRouteView = true

            var depth = 0
            while(parent&&parent._routerRoot !== parent){
                var vnodeData = parent.$vnode ? parent.$vnode.data : {};
                if (vnodeData.dataRouteView) {
                    depth++;
                }
                parent = parent.$parent
            }
            let m = matched[depth]
            data.registerInstance = function (vm,val) {
                var current = m.instances[name]
                if(val&& current !== vm||!val&&val===current){
                    m.instances[name] = val
                }
            }
            // debugger
            return h(matched[depth]?matched[depth].components[name||'default']:null,data,children)
        }
    })


    Vue.mixin({
        beforeCreate(){
            if(this.$options&&this.$options.router){
                this._root = this
                this._router = this.$options.router
                Vue.util.defineReactive(this,'xxx',this._router.history)
            }else{
                this._root =  this.$parent && this.$parent._root
            }
            debugger
            registerInstance(this,this)
            Object.defineProperty(this,'$router',{
                get(){
                    return this._root._router
                }
            })
            //this.history.current
            Object.defineProperty(this,'$route',{
                get(){
                    return this._root._router.history.current
                }
            })
        }
    })
}
export default VueRouter