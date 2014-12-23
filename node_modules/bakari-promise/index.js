// Bakari Promise
module.exports = function(){

    var promise = {

        /* 
         * @name status 承诺的状态
         * @author early
         * @lastupdate 2014-7-30
         *
         * @type property string
         * @belong module Promise
         *
         * @note 
                承诺目前的状态，分为以下几种：

                - pending : 尚未完成
                - resolved : 已解决
                - rejected : 已拒绝
                - resolving : 正在解决
                - rejecting : 正在拒绝
         */
        status : 'pending',

        /* 
         * @name callback 承诺回调函数队列
         * @author early
         * @lastupdate 2014-7-30
         *
         * @type property obejct
         * @belong module Promise
         *
         * @note 
                承诺的回调函数队列，队列中的回调函数分为三种，分别是：

                - resolve : 承诺成功时的回调函数
                - rejcet : 承诺失败时的回调函数
                - always : 承诺成功或失败的回调函数
         */
        callback : {

            resolve : [],
            reject : [],
            always : []

        },

        /* 
         * @name arguments 承诺解决或拒绝的参数
         * @author early
         * @lastupdate 2014-7-30
         *
         * @type property obejct|null
         * @belong module Promise
         *
         * @note 
                承诺接收到的参数。

                这个属性在承诺成功或失败时被赋值，之后所有的回调函数的传入参数都将时这个属性的值。

                在某些情况下，你可以通过一个较早的回调函数来预处理这些参数，使得之后的回调函数可以便捷的使用这些参数。
         */
        arguments : null,

        /* 
         * @name originArguments 承诺解决或拒绝的原始参数
         * @author early
         * @lastupdate 2014-8-4
         *
         * @type property obejct|null
         * @belong module Promise
         *
         * @note 
                承诺最初所接收到的参数，当回调函数修改[`arguments`](Promise.html#cpro_arguments)的值之后，你仍可以通过这个属性访问到原始的参数值。
         */
        originArguments : null,

        /* 
         * @name resolve 承诺被解决
         * @author early
         * @lastupdate 2014-7-30
         *
         * @type function
         * @belong module Promise
         * @test unit modules.promise
         *
         * @param arguments optional any 承诺被解决后传入的参数，所有的承诺函数都会被运行
         * @return object 返回承诺对象
         *
         * @jsbin 0 zosid/37 js,console
         * @note 
                调用这个方法可以解决一个承诺，承诺将会标示为成功。

                这个方法被调用后，承诺会开始执行[callback](Promise.html#cpro_callback)中类型为`resolve`和`always`的回调函数，`resolve`类型的回调函数将先被执行。

                这个方法传入的所有参数都会被保存在承诺的[`arguments`](Promise.html#cpro_arguments)属性中，所有回调函数都会被传入这组参数。

                只有状态为`pedding`的承诺才会响应此方法，若一个承诺的状态已经是成功或失败时，承诺将维持原有的状态。

                你可以像这样使用：

                |   var promise = Bakari.Promise();
                |
                |   promise.done(function(){
                |       console.log('success!');
                |   });
                |
                |   promise.always(function(){
                |       console.log('end!');
                |   })
                |
                |   setTimeout(function(){
                |
                |       // console.log 'success!' then console.log 'end!'
                |       promise.resolve();
                |
                |   }, 1000);
         */
        resolve : function(){

            var i;

            // 如果承诺的状态不为pending则直接返回
            if ( this.status !== 'pending' ) {
                return;
            }

            this.arguments = arguments;
            this.originArguments = arguments;
            this.status = 'resolving';
            
            // 循环调用callback
            for ( i=0; i < this.callback.resolve.length; i++ ) {
                this.callback.resolve[i].apply( this, this.arguments );
            }

            // 执行always函数
            for ( i=0; i < this.callback.always.length; i++ ) {
                this.callback.always[i].apply( this, this.arguments );
            }

            this.status = 'resolved';
            return this;

        },

        /* 
         * @name reject 承诺被拒绝
         * @author early
         * @lastupdate 2014-7-30
         *
         * @type function
         * @belong module Promise
         * @test unit modules.promise
         *
         * @param arguments optional any 承诺被拒绝后传入的参数，所有的承诺函数都会被运行
         * @return object 返回承诺对象
         *
         * @jsbin 0 zosid/38 js,console
         * @note 
                调用这个方法可以拒绝一个承诺，承诺将会标示为失败。

                这个方法被调用后，承诺会开始执行[callback](Promise.html#cpro_callback)中类型为`reject`和`always`的回调函数，`reject`类型的回调函数将先被执行。

                这个方法传入的所有参数都会被保存在承诺的[`arguments`](Promise.html#cpro_arguments)属性中，所有回调函数都会被传入这组参数。

                只有状态为`pedding`的承诺才会响应此方法，若一个承诺的状态已经是成功或失败时，承诺将维持原有的状态。

                你可以像这样使用：

                |   var promise = Bakari.Promise();
                |
                |   promise.fail(function(){
                |       console.log('fail!');
                |   });
                |
                |   promise.always(function(){
                |       console.log('end!');
                |   })
                |
                |   setTimeout(function(){
                |
                |       // console.log 'fail!' then console.log 'end!'
                |       promise.reject();
                |
                |   }, 1000);
         */
        reject : function(){

            var i;

            // 如果承诺的状态不为pending则直接返回
            if ( this.status !== 'pending' ) {
                return;
            }

            this.arguments = arguments;
            this.originArguments = arguments;
            this.status = 'rejecting';
            
            // 循环调用callback
            for ( i=0; i < this.callback.reject.length; i++ ) {
                this.callback.reject[i].apply( this, this.arguments );
            }

            // 执行always函数
            for ( i=0; i < this.callback.always.length; i++ ) {
                this.callback.always[i].apply( this, this.arguments );
            }

            this.status = 'rejected';
            return this;
            
        },

        /* 
         * @name then 向承诺添加处理函数
         * @author early
         * @lastupdate 2014-7-30
         *
         * @type function
         * @belong module Promise
         * @test unit modules.promise
         *
         * @param resolveFn optional function 传入一个承诺成功的处理函数
         * @param rejectFn optional function 传入一个承诺被拒绝的处理函数
         * @return Object 返回承诺对象
         *
         * @jsbin 0 zosid/39 js,console
         * @note 
                向一个承诺添加回调函数，此方法可以添加成功回调函数及失败回调函数。

                若添加回调函数时，承诺已有结论，回调函数将立即被执行。

                回调函数的参数将是承诺[`arguments`](Promise.html#cpro_arguments)属性的值，上下文为承诺本身。

                你可以像这样使用：

                |   var promise1 = Bakari.Promise(), promise2 = Bakari.Promise();
                |
                |   promise1.then(function(){
                |       console.log('success!');
                |   }, function(){
                |       console.log('fail!');
                |   });
                |
                |   promise2.then(function(){
                |       console.log('success!');
                |   }, function(){
                |       console.log('fail!');
                |   });
                |
                |   setTimeout(function(){
                |
                |       // console.log 'fail!'
                |       promise1.reject();
                |       
                |       // console.log 'success!'
                |       promise2.resolve();
                |
                |   }, 1000);


         */
        then : function( resolveFn, rejectFn ){
            
            // 向回调函数堆栈推入函数
            if ( typeof resolveFn === 'function' ) {
                this.callback.resolve.push(resolveFn);
            }
            if ( typeof rejectFn === 'function' ) {
                this.callback.reject.push(rejectFn);
            }

            // 如果在承诺已经解决 并且含有承诺成功函数 立即执行函数
            if ( this.status === 'resolved' && typeof resolveFn === 'function' ) {
                resolveFn.apply( this, this.arguments );
            }

            // 如果在承诺已拒绝 并且含有承诺拒绝函数 立即执行函数
            if ( this.status === 'rejected' && typeof rejectFn === 'function' ) {
                rejectFn.apply( this, this.arguments );
            }

            return this;

        },

        /* 
         * @name done 向承诺添加成功处理函数
         * @author early
         * @lastupdate 2014-7-30
         *
         * @type function
         * @belong module Promise
         * @test unit modules.promise
         *
         * @param fn required function 传入一个承诺成功的处理函数
         * @return Object 返回承诺对象
         *
         * @jsbin 0 zosid/40 js,console
         * @note 
                向一个承诺添加成功回调函数。

                若添加回调函数时，承诺已有结论，回调函数将立即被执行。

                回调函数的参数将是承诺[`arguments`](Promise.html#cpro_arguments)属性的值，上下文为承诺本身。

                你可以像这样使用：

                |   var promise = Bakari.Promise();
                |
                |   promise.done(function(){
                |       console.log('success!');
                |   });
                |
                |   setTimeout(function(){
                |
                |       // console.log 'success!'
                |       promise.resolve();
                |
                |   }, 1000);
         */
        done : function( fn ){
            
            // 向回调函数堆栈推入函数
            if ( typeof fn === 'function' ) {
                this.callback.resolve.push(fn);
            }

            // 如果在承诺已经解决 并且含有承诺成功函数 立即执行函数
            if ( this.status === 'resolved' && typeof fn === 'function' ) {
                fn.apply( this, this.arguments );
            }

            return this;

        },

        /* 
         * @name fail 向承诺添加失败处理函数
         * @author early
         * @lastupdate 2014-7-30
         *
         * @type function
         * @belong module Promise
         * @test unit modules.promise
         *
         * @param fn required function 向承诺添加一个失败处理函数
         * @return Object 返回承诺对象
         *
         * @jsbin 0 zosid/41 js,console
         * @note 
                向一个承诺添加失败回调函数。

                若添加回调函数时，承诺已有结论，回调函数将立即被执行。

                回调函数的参数将是承诺[`arguments`](Promise.html#cpro_arguments)属性的值，上下文为承诺本身。

                你可以像这样使用：

                |   var promise = Bakari.Promise();
                |
                |   promise.fail(function(){
                |       console.log('fail!');
                |   });
                |
                |   setTimeout(function(){
                |
                |       // console.log 'fail!'
                |       promise.reject();
                |
                |   }, 1000);
         */
        fail : function( fn ){
            
            // 向回调函数堆栈推入函数
            if ( typeof fn === 'function' ) {
                this.callback.reject.push(fn);
            }

            // 如果在承诺已拒绝 并且含有承诺拒绝函数 立即执行函数
            if ( this.status === 'rejected' && typeof fn === 'function' ) {
                fn.apply( this, this.arguments );
            }

            return this;

        },

        /* 
         * @name always 向承诺添加成功或失败时处理函数
         * @author early
         * @lastupdate 2014-7-30
         *
         * @type function
         * @belong module Promise
         * @test unit modules.promise
         *
         * @param fn required function 向承诺添加一个成功或失败时处理函数
         * @return Object 返回承诺对象
         *
         * @jsbin 0 zosid/43 js,console
         * @note  
                向一个承诺添加成功或失败的回调函数。

                若添加回调函数时，承诺已有结论，回调函数将立即被执行。

                回调函数的参数将是承诺[`arguments`](Promise.html#cpro_arguments)属性的值，上下文为承诺本身。

                你可以像这样使用：

                |   var promise1 = Bakari.Promise(), promise2 = Bakari.Promise();
                |
                |   promise1.always(function(){
                |       console.log('hit!');
                |   });
                |
                |   promise2.always(function(){
                |       console.log('hit!');
                |   });
                |
                |   setTimeout(function(){
                |
                |       // console.log 'hit!'
                |       promise1.reject();
                |       
                |       // console.log 'hit!'
                |       promise2.resolve();
                |
                |   }, 1000);
         */
        always : function( fn ){

            // 向回调函数堆栈推入函数
            if ( typeof fn === 'function' ) {
                this.callback.always.push(fn);
            }

            // 如果承诺已经被处理 立即执行函数
            if ( ( this.status === 'rejected' || this.status === 'resolved' ) && typeof fn === 'function' ) {
                fn.apply( this, this.arguments );
            }
            
            return this;
        }

    };
    
    return promise;

};