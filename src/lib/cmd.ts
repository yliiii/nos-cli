import NosClient from './sdk'
import { baseObjectParams } from '../types/object'
import dayjs from 'dayjs'
import { initInputParams } from '../types/cmd'
import log from './log'
import presetConf from '../conf'
import { resolve } from 'path'

export function init(cmd: string, params: initInputParams): void {
  let nos: NosClient
  let nosConf
  let {
    bucket: bucketCmd,
    config: configCmd,
    env: envCmd,
    list: listCmd,
    upload: uploadCmd
  } = params

  if (!bucketCmd) {
    log.error('Please set a valid bucket! \n')
    process.exit(1)
  }

  if (cmd && presetConf[cmd]) {
    nosConf = {
      defaultBucket: bucketCmd,
      ...presetConf[cmd]
    }
  } else if (configCmd) {
    let config = require(resolve(__dirname, configCmd))

    nosConf = {
      defaultBucket: bucketCmd,
      ...config
    }
  }

  if (!nosConf) {
    log.error('Please use "-c" to set nos config! \n')
    process.exit(1)
  }

  const { pathPrefix, ...conf } = nosConf
  nos = new NosClient(conf, {
    uploaded: (res: any) => log.error('uploaded: \n',  res),
    uploadError: (err: any) => log.error('upload error: \n', err),
    removed: (res: any) => log.info('removed: \n', res),
    removeError: (err: any) => log.error('remove error: \n', err)
  })

  listCmd && list(nos, typeof listCmd === 'string' ? listCmd : '')

  if (uploadCmd) {
    log.info(`env: ${envCmd} pathPrefix: ${envCmd ? pathPrefix[envCmd] : ''} \n`)
    /**如果设定了path，就需要设置环境变量来匹配path前缀 */
    let prefix = envCmd && pathPrefix ? pathPrefix[envCmd] || '' : ''
    upload(nos, uploadCmd, prefix)
  }
}

/**
 * 返回列表内容
 */
export async function list(nos: NosClient, prefix: string) {
  let res = await nos.showFiles({ delimiter: prefix ? '' : '/', prefix })

  if (prefix) {
    let list = res.items.map((v: baseObjectParams) => [v.key, v.size, dayjs(v.lastModified).format('YYYY-MM-DD HH:mm:ss'), v.eTag])
    list.unshift(['文件路径', '文件大小', '修改时间', 'ETAG'])
    log.table(list).info()
  } else {
    log.table(res.map((v: baseObjectParams) => [v.prefix])).info()
  }

  return res
}

/**
 * 上传资源
 */
export function upload(nos: NosClient, path: string, prefix: string = '', ) {
  let filesMap = nos.getFilesArgs(path).map(map => {
    let { objectKey, fileName, file, contentType } = map
    return {
      ...map,
      objectKey: prefix + objectKey
    }
  })

  nos.batchHandler(filesMap)

  return filesMap
}