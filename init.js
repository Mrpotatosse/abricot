import { writeFileSync, existsSync } from 'fs';

if(!existsSync(process.argv[2])) {
  writeFileSync(process.argv[2], 
`app:
  api:
    prefix: /api
    port: 3000
  modules: 
    - name: Test
      path: {src}/test_module/index.js
    - name: Dofus2
      path: {src}/dofus2_module/index.js
      args:
        - dist/injector_module/scan_script.js
        - 5555
        - [Dofus.exe]
        - [127.0.0.1, 0.0.0.0, localhost]
        - <DOFUS_GAME_PATH_WITH_EXECUTABLE>
  `)
}