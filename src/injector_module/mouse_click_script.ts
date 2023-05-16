// @ts-nocheck
const user32 = Module.load('user32.dll');
const enumWindows = new NativeFunction(user32.getExportByName('EnumWindows'), 'bool', ['pointer', 'int']);
const getWindowThreadProcessId = new NativeFunction(user32.getExportByName('GetWindowThreadProcessId'), 'uint32', [
    'pointer',
    'pointer',
]);
const postMessage = new NativeFunction(user32.getExportByName('PostMessageW'), 'bool', [
    'pointer',
    'uint',
    'int',
    'int',
]);
const getClientRect = new NativeFunction(user32.getExportByName('GetClientRect'), 'bool', ['pointer', 'pointer']);

send({
    type: 'request',
});

const op = recv((value) => {
    if (!value.x || !value.y) {
        throw `missing properties ${value} required { x: number; y: number }`;
    }

    const pid = Process.id; // The process ID you want to find the window handle for

    let rect = Memory.alloc(16); // Allocate memory for RECT structure
    let hwnd = null;

    const enumWindowsProc = new NativeCallback(
        (hWnd, lParam) => {
            const lpdwProcessId = Memory.alloc(Process.pointerSize);
            getWindowThreadProcessId(hWnd, lpdwProcessId);
            if (lpdwProcessId.readU32() === pid) {
                hwnd = hWnd;
                return 0;
            }
            return 1;
        },
        'int',
        ['pointer', 'int'],
    );

    enumWindows(enumWindowsProc, 0);
    getClientRect(hwnd, rect);

    const width = rect.add(8).readU32() - rect.readU32();
    const height = rect.add(12).readU32() - rect.add(4).readU32();

    const x = value.x * width; // The x-coordinate-ratio of the click position
    const y = value.y * height; // The y-coordinate-ratio of the click position

    const WM_LBUTTONDOWN = 0x0201;
    const WM_LBUTTONUP = 0x0202;
    const MK_LBUTTON = 0x0001;

    const lParam = (y << 16) | x;

    if (value.double_click) {
        postMessage(hwnd, WM_LBUTTONDOWN, MK_LBUTTON, lParam);
        postMessage(hwnd, WM_LBUTTONUP, 0, lParam);
        postMessage(hwnd, WM_LBUTTONDOWN, MK_LBUTTON, lParam);
        postMessage(hwnd, WM_LBUTTONUP, 0, lParam);
    } else {
        postMessage(hwnd, WM_LBUTTONDOWN, MK_LBUTTON, lParam);
        postMessage(hwnd, WM_LBUTTONUP, 0, lParam);
    }
});

op.wait();
