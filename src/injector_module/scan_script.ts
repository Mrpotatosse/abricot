// @ts-nocheck
var connect_p = Module.getExportByName(null, 'connect');
var send_p = Module.getExportByName(null, 'send');
var socket_send = new NativeFunction(send_p, 'int', ['int', 'pointer', 'int', 'int']);
var recv_p = Module.getExportByName(null, 'recv');
var socket_recv = new NativeFunction(recv_p, 'int', ['int', 'pointer', 'int', 'int']);

Interceptor.attach(send_p, {
    onEnter: function (args) {
        this.sockfd = parseInt(args[0]);
        this.buf = args[1];
        this.len = args[2];

        const socket_type = Socket.type(this.sockfd);

        if (socket_type == 'tcp') {
            const range_object = Process.getRangeByAddress(this.buf);

            const host_address = Socket.localAddress(this.sockfd);
            const target_address = Socket.peerAddress(this.sockfd);

            const message = {
                type: 'send',
                host_ip: host_address.ip,
                host_port: host_address.port,
                target_ip: target_address.ip,
                target_port: target_address.port,
                pid: Process.id,
            };

            send(message, range_object.base.readByteArray(range_object.size));
        }
    },
    onLeave: function (retval) {},
});

Interceptor.attach(recv_p, {
    onEnter: function (args) {
        this.sockfd = parseInt(args[0]);
        this.buf = args[1];
        this.len = args[2];

        const socket_type = Socket.type(this.sockfd);

        if (socket_type == 'tcp') {
            const range_object = Process.getRangeByAddress(this.buf);

            const host_address = Socket.localAddress(this.sockfd);
            const target_address = Socket.peerAddress(this.sockfd);

            const message = {
                type: 'recv',
                host_ip: host_address.ip,
                host_port: host_address.port,
                target_ip: target_address.ip,
                target_port: target_address.port,
                pid: Process.id,
            };

            send(message, range_object.base.readByteArray(range_object.size));
        }
    },
    onLeave: function (retval) {},
});
