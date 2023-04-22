//var write_p = Module.getExportByName(null, 'write');
//var pipe_write = new NativeFunction(write_p, 'int', ['int', 'pointer', 'int'])
var send_p = Module.getExportByName(null, 'send');
var socket_send = new NativeFunction(send_p, 'int', ['int', 'pointer', 'int', 'int']);
var recv_p = Module.getExportByName(null, 'recv');
var socket_recv = new NativeFunction(recv_p, 'int', ['int', 'pointer', 'int', 'int']);

Interceptor.attach(send_p, {
    onEnter: function (args) {
        this.sockfd = args[0];
        this.buf = args[1];
        this.len = args[2];

        console.log("send");
    },
    onLeave: function (retval) {
    
    }
});

Interceptor.attach(recv_p, {
    onEnter: function (args)  {
        this.sockfd = args[0];
        this.buf = args[1];
        this.len = args[2];
        
        console.log("recv");
    },
    onLeave: function (retval) {

    }
})
