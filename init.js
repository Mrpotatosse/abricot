import { writeFileSync, existsSync, mkdir } from 'fs';

if(!existsSync(process.argv[2])) {
  writeFileSync(process.argv[2], 
`app:
  api:
    ws: /ws
    prefix: /api
    port: 3000
  modules: 
    - name: Dofus2
      path: {src}/dofus2_module/index.js
      args:
        - scripts:
            scan:
              path: {src}/injector_module/scan_script.js
              api: false
            mouse_click:
              path: {src}/injector_module/mouse_click_script.js
              api: true          
          ignore_ips: [127.0.0.1, 0.0.0.0, localhost]
          authorize_ports: 5555
          folder: <DOFUS_FOLDER_PATH>
          botofu: <BOTOFU_EXECUTABLE_PATH>
  `)
}

mkdir('bin', () => {}); 
mkdir('bin/history', () => {})