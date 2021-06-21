import { createStream, table } from 'table'

import { baseObjectParams } from '../types/object';
import chalk from 'chalk'

export class Log {
  isStream: boolean = false
  streamTable: any = {}
  tableCtx: any = null

  constructor(params: baseObjectParams = {}) {
    const { table, isStream } = params

    table && (this.tableCtx = table)
    this.isStream = !!isStream
  }

  info(...args: any[]): Log {
    if (this.tableCtx) {
      return this.output.apply(this, [
        table(this.tableCtx, this.setTabel('info'))
      ])
    }

    if (this.isStream && this.streamTable.info) {
      this.streamTable.info.write.apply(createStream, args)
      return this
    }

    return this.output.apply(this, [
      chalk.black.bgGreen('[INFO]'),
      ...(args.map(arg => arg instanceof table ? arg : chalk.green(JSON.stringify(arg))))
    ])
  }

  error(...args: any[]): Log {
    if (this.tableCtx) {
      return this.output.apply(this, [
        table(this.tableCtx, this.setTabel('error'))
      ])
    }

    if (this.isStream && this.streamTable.error) {
      this.streamTable.info.write.apply(createStream, args)
      return this
    }

    return this.output.apply(this, [
      chalk.white.bgRed('[ERROR]'),
      ...(args.map(arg => chalk.red(JSON.stringify(arg))))
    ])
  }

  table(data: any[]): Log {
    return new Log({ table: data})
  }

  stream({ columnCount = 1 }): Log {
    const streamLog = new Log({ isStream: true })
    const columnDefault = { width: 50 }

    streamLog.streamTable = {
      info: createStream({
        columnDefault,
        ...streamLog.setTabel('info'),
        columnCount
      }),
      error: createStream({
        columnDefault,
        ...streamLog.setTabel('error'),
        columnCount
      })
    }

    return streamLog
  }

  setTabel(type: string) {
    let style = (() => {
      switch(type) {
        case 'info':
          return chalk.green
        case 'error':
          return chalk.red
        default:
          return chalk.white
      }
    })()

    return {
      border: {
        topBody: style(`─`),
        topJoin: style(`┬`),
        topLeft: style(`┌`),
        topRight: style(`┐`),

        bottomBody: style(`─`),
        bottomJoin: style(`┴`),
        bottomLeft: style(`└`),
        bottomRight: style(`┘`),

        bodyLeft: style(`│`),
        bodyRight: style(`│`),
        bodyJoin: style(`│`),

        joinBody: style(`─`),
        joinLeft: style(`├`),
        joinRight: style(`┤`),
        joinJoin: style(`┼`)
      }
    }
  }

  output(...args: any[]): Log {
    // @ts-ignore: 忽略编译报错。
    console.log.apply(null, args)
    return this
  }
}

export default new Log()

