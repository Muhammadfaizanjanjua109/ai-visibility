#!/usr/bin/env node
// ============================================================
// ai-visibility CLI
// ============================================================

import { Command } from 'commander'
import { registerInit } from './commands/init'
import { registerAnalyze } from './commands/analyze'
import { registerGenerate } from './commands/generate'
import { registerLogs } from './commands/logs'

const program = new Command()

program
    .name('ai-visibility')
    .description('Make your web app citable by AI models')
    .version('0.1.0')

registerInit(program)
registerAnalyze(program)
registerGenerate(program)
registerLogs(program)

program.parse(process.argv)
