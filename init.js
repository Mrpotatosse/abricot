import { writeFileSync, existsSync, mkdir } from 'fs';

if(!existsSync(process.argv[2])) {
  writeFileSync(process.argv[2], 
`app:
  api:
    prefix: /api
    port: 3000
  modules: 
    - name: Dofus2
      path: {src}/dofus2_module/index.js
      args:
        - {src}/injector_module/scan_script.js
        - 5555
        - [Dofus.exe]
        - [127.0.0.1, 0.0.0.0, localhost]
        - <DOFUS_FOLDER_PATH> 
        - <BOTOFU_EXECUTABLE>
  `)
}

mkdir('bin', () => {});
mkdir('gun', () => {});