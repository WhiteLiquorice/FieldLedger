import { execFileSync } from 'node:child_process';
import path from 'node:path';

/** Windows Java launchers can leave their JVM alive after Firebase CLI has exited. */
export function cleanupFirestoreEmulator(root, project, port) {
  if (process.platform !== 'win32') return;
  if (!/^demo-fieldledger-(rules|acceptance)$/.test(project) || !Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Refusing cleanup with an unknown emulator identity.');
  const quote = value => `'${value.replace(/'/g, "''")}'`;
  const rules = path.resolve(root, 'firestore.rules');
  const command = `$ErrorActionPreference = 'Stop'
$testRulePath = ${quote(rules)}
$testPortPattern = ${quote(`--port ${port} `)}
$testProjectPattern = ${quote(`--project_id ${project} `)}
$testProcesses = @(Get-CimInstance Win32_Process -Filter "Name='java.exe'" | Where-Object {
  $_.CommandLine -and $_.CommandLine.Contains($testRulePath) -and $_.CommandLine.Contains($testPortPattern) -and $_.CommandLine.Contains($testProjectPattern)
})
foreach ($testProcess in $testProcesses) {
  if (Get-Process -Id $testProcess.ProcessId -ErrorAction SilentlyContinue) {
    Stop-Process -Id $testProcess.ProcessId -Force
    Write-Output "Cleaned up completed FieldLedger emulator PID $($testProcess.ProcessId)"
  }
}`;
  const output = execFileSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', command], { encoding: 'utf8', windowsHide: true, timeout: 15000 });
  if (output.trim()) console.log(output.trim());
}
