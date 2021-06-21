import NosClient from './sdk'
import { baseObjectParams } from '../types/object'
import dayjs from 'dayjs'
import { initInputParams } from '../types/cmd'
import log from './log'
import presetConf from '../conf'
import { resolve } from 'path'

export function init(cmd: initInputParams = {
  bucket: '',
  config: '',
  env: '',
  list: '',
  upload: '',
  normal: false
} ): void {
  let nos: NosClient
  let nosConf = null
  let bucketCmd = ''
  let configCmd = ''
  let envCmd = ''
  let listCmd = ''
  let uploadCmd = ''
  let normalCmd = false

  if (cmd && typeof cmd === 'string' && presetConf[cmd]) {
    nosConf = presetConf[cmd]
  } else {
    bucketCmd = cmd.bucket
    configCmd = cmd.config
    envCmd = cmd.env
    listCmd = cmd.list
    uploadCmd = cmd.upload
    normalCmd = cmd.normal

    /**这里需要使用相对路径，不能使用__dirname */
    let extConfig = configCmd ? require(resolve(configCmd)) : null

    if (extConfig) {
      nosConf = extConfig
    } else {
      log.error('please use "-c" to set nos config! \n')
      process.exit(1)
    }
  }

  if (!bucketCmd) {
    log.error('please set a valid bucket! \n')
    process.exit(1)
  }

  let streamLogger: any
  let defaultBucket = bucketCmd
  let { cdn, pathPrefix, ...config } = nosConf
  nos = new NosClient({
    ...config,
    defaultBucket
  }, {
    uploaded: (res: any) => streamLogger && streamLogger.info([cdn ? `${cdn}/${res.objectKey}` : res.objectKey, 'upload success']),
    uploadError: (err: any) => streamLogger && streamLogger.error([err, '']),
    removed: (res: any) => streamLogger && streamLogger.info([res.objectKey, 'remove success']),
    removeError: (err: any) => streamLogger && streamLogger.error([err, '']),
    completed: () => log.output('\n upload completed！！！')
  })

  listCmd && list(nos, typeof listCmd === 'string' ? listCmd : '')

  if (uploadCmd) {
    streamLogger = log.stream({ columnCount: 2 })

    if (pathPrefix && (!envCmd || !pathPrefix[envCmd])) {
      log.error('please use "-e" to set valid pathPrefix env! \n')
      process.exit(1)
    }

    log.info(`env: ${envCmd} pathPrefix: ${envCmd ? pathPrefix[envCmd] : ''} \n`)
    /**如果设定了path，就需要设置环境变量来匹配path前缀 */
    let prefix = envCmd && pathPrefix ? pathPrefix[envCmd] || '' : ''
    upload(nos, uploadCmd, prefix, !normalCmd)
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
export function upload(nos: NosClient, path: string, prefix: any = '', md5: boolean = false ) {
  /**路径容错，防止上传至错误路径 */
  if (prefix && prefix[prefix.length - 1] !== '/') {
    prefix += '/'
  }

  let filesMap = nos.getFilesArgs({
    filePath: path,
    md5
  }).map(map => {
    let { objectKey, fileName, file, contentType } = map

    return {
      ...map,
      objectKey: prefix + objectKey
    }
  })

  nos.batchHandler(filesMap)

  return filesMap
}