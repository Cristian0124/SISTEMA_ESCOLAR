const { spawn } = require("node:child_process");
const path = require("node:path");

const tscPath = path.resolve(__dirname, "../node_modules/typescript/bin/tsc");
const serverPath = path.resolve(__dirname, "../dist/server.js");

let server = null;
let stopping = false;
let pendingCompilerOutput = "";

const compiler = spawn(
  process.execPath,
  [tscPath, "--watch", "--preserveWatchOutput"],
  { cwd: path.resolve(__dirname, ".."), stdio: ["inherit", "pipe", "inherit"] }
);

compiler.stdout.on("data", (chunk) => {
  const output = chunk.toString();
  process.stdout.write(output);
  pendingCompilerOutput += output;
  const lineas = pendingCompilerOutput.split(/\r?\n/);
  pendingCompilerOutput = lineas.pop() ?? "";

  for (const linea of lineas) {
    const resultado = linea.match(/Found (\d+) errors?\./);
    if (!resultado) continue;
    if (resultado[1] !== "0") {
      detenerServidor();
    } else {
      reiniciarServidor();
    }
  }
});

compiler.on("error", (error) => {
  console.error("No se pudo iniciar el compilador TypeScript:", error.message);
  process.exitCode = 1;
});

compiler.on("exit", (code) => {
  if (!stopping) {
    console.error(`El compilador terminó inesperadamente (código ${code ?? "desconocido"}).`);
    detener();
    process.exitCode = code ?? 1;
  }
});

function reiniciarServidor() {
  detenerServidor();
  server = spawn(process.execPath, [serverPath], {
    cwd: path.resolve(__dirname, ".."),
    stdio: "inherit"
  });
  server.on("error", (error) => {
    console.error("No se pudo iniciar el backend:", error.message);
  });
}

function detenerServidor() {
  if (server && server.exitCode === null) server.kill();
  server = null;
}

function detener() {
  if (stopping) return;
  stopping = true;
  detenerServidor();
  if (compiler.exitCode === null) compiler.kill();
}

process.on("SIGINT", detener);
process.on("SIGTERM", detener);
