import { ChildProcessWithoutNullStreams } from 'child_process';
import { spawn } from 'node:child_process';
import process from 'node:process';
import { ScriptEvent } from '@/event/ScriptEvent';
import readConfigAction from '@/api/config/read-config';
import { triggerCommand } from '@/api/command/submit-command';

let bdsProcess: ChildProcessWithoutNullStreams| null = null;

function $accessInstance() {
  if (!bdsProcess) {
    throw 'Child process not initialized';
  } else {
    return bdsProcess;
  }
}

export function $initialize(bdsCommand: string) {
  bdsProcess = spawn(bdsCommand, { stdio: 'pipe' });

  const customCommandPrefix = readConfigAction.handler({
    namespace: 'command-core',
    defaults: { commandPrefix: '.' }
  }).data!.commandPrefix as string;

  bdsProcess.stdout.on('data', (data) => {
    process.stdout.write(data);
  });
  bdsProcess.stderr.on('data', (data) => {
    process.stderr.write(data);
  });
  process.stdin.on('data', (data) => {
    if (data.toString().startsWith(customCommandPrefix)) {
      const dataString = data.toString();
      const commandString = dataString.slice(
        customCommandPrefix.length,
        dataString.length - 2
      );
      triggerCommand(commandString);
      return;
    }
    $accessInstance().stdin.write(data);
  });

  return bdsProcess;
}

export function sendCommand(command: string) {
  $accessInstance().stdin.write(`${command}\r\n`); // only tested on Windows
}

export function triggerScriptEvent(namespace: string, event: ScriptEvent) {
  sendCommand(`scriptevent ${namespace}:${event.eventName} ${JSON.stringify(event)}`);
}