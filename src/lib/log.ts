import chalk from 'chalk'
import { table } from 'table'

export class Log {
  tableCtx: any[] = []

  constructor(tableCtx?: any) {
    this.tableCtx = tableCtx
  }

  info(...args: any[]): Log {
    if (this.tableCtx) {
      return this.output.apply(this, [
        table(this.tableCtx, this.setTabel('info'))
      ])
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

    return this.output.apply(this, [
      chalk.white.bgRed('[ERROR]'),
      ...(args.map(arg => chalk.red(JSON.stringify(arg))))
    ])
  }

  table(data: any[]): Log {
    return new Log(data)
  }


  protected setTabel(type: string) {
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
    console.log.apply(null, args)
    return this
  }
}

export default new Log()

