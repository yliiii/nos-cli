import {
  extMap,
  fileMap,
  listenerCallback
} from '../types/sdk'

import { NosClient } from '@xgheaven/nos-node-sdk'
import Q from 'q'
import fs from 'fs'
import { resolve } from 'path'
import { sdkConf } from '../types/cmd'
import through2 from 'through2'

const FILE_IGNORE = [
  '.DS_Store'
]

export default class NOS {
  static EXT_MAP: extMap = {
    css: 'text/css',
    json: 'application/json',
    js: 'application/javascript',
    htm: 'text/html',
    html: 'text/html',
    jsp: 'text/html',
    ico: 'image/x-icon',
    png: 'image/png',
    jpe: 'image/jpeg',
    jpeg: 'image/jpeg',
    jpg: 'image/jpeg',
    gif: 'image/gif',
    mp4: 'video/mpeg4',
    mp3: 'audio/mp3',
    pdf:	'application/pdf',
    woff: 'application/octet-stream',
    ttf: 'application/octet-stream'
  }

  nos: NosClient
  listener: listenerCallback
  nextMarker: string = '' // 记录showfile当前记录的位置
  nosEnvPath: string = ''

  constructor(params: sdkConf, cb: listenerCallback = {}) {
    const { accessKey, accessSecret, endpoint, defaultBucket } = params

    if (!accessKey || !accessSecret || !endpoint) {
      throw new Error('[Error] "accessKey" "accessSecret" "endpoint" is required ')
    }

    this.nos = new NosClient({
      accessKey,
      accessSecret,
      endpoint,
      defaultBucket
    })

    this.listener = cb

    return this
  }

  /**
   * 
   * @param ext
   */
  protected getContentType(ext: string): string {
    return !NOS.EXT_MAP[ext] ? 'application/octet-stream' : NOS.EXT_MAP[ext]
  }

  /**
   *
   * @param filePath
   * @param rootPath 
   */
  getFilesArgs(filePath: string, rootPath?: string) {
    let files: Array<fileMap> = []

    fs.readdirSync(filePath).forEach(fileName => {
      const stat = fs.lstatSync(resolve(filePath, fileName))

      if (stat.isDirectory()) {
        files = files.concat(this.getFilesArgs(resolve(filePath, fileName), rootPath ? `${rootPath}/${fileName}` : fileName))
      } else {
        if (FILE_IGNORE.indexOf(fileName) > -1) return

        const ext = fileName.split('.')

        files.push({
          fileName,
          objectKey: `${this.nosEnvPath || rootPath || ''}/${fileName}`,
          file: resolve(filePath, fileName),
          contentType: this.getContentType(ext.length > 1 ? ext[ext.length - 1] : ext[0])
        })
      }
    })

    return files
  }

  setNosEnvPath(path: string) {
    this.nosEnvPath = path ? path.split('/').filter(p => !!p).join('/') : ''
  }

  /**
   * 
   * @param param0
   */
  showFiles({ limit = 100, delimiter = '', prefix = '' }): Q.Promise<any> {
    let deferred = Q.defer()

    this.nos.listObject({
      limit,
      delimiter,
      prefix
    }).then(res => {
      const { commonPrefixes, nextMarker, items } = res
      deferred.resolve(delimiter ? commonPrefixes : {
        nextMarker,
        items
      })
    })

    return deferred.promise
  }

  /**
   * 
   * @param fileArgs
   */
  putFile(fileArgs: fileMap): Q.Promise<any> {
    let deferred = Q.defer()

    this.nos.putObject(fileArgs).then((res: any) => {
      const payload = {
        ...fileArgs,
        ...res
      }

      this.listener.uploaded && this.listener.uploaded(payload)
      deferred.resolve(payload)
    }).catch((err: any) => {
      this.listener.uploadError && this.listener.uploadError(err)
      deferred.reject(err)
    })

    return deferred.promise
  }

  /**
   * 
   * @param fileArgs
   */
  removeFile(fileArgs: fileMap): Q.Promise<any> {
    let deferred = Q.defer()
    let { objectKey } = fileArgs

    this.nos.deleteObject({
      objectKey
    }).then(() => {
      this.listener.removed && this.listener.removed(objectKey)
      deferred.resolve(objectKey)
    }).catch(err => {
      this.listener.removeError && this.listener.removeError(err)
      deferred.reject(err)
    })

    return deferred.promise
  }

  /**
   *
   * @param arg [string|array] 支持传入path，或者已经格式化好的fileMap
   * @param isRemove [boolean]
   */
  batchHandler(arg: any, isRemove?: boolean): Q.Promise<any> {
    let counter = 0
    let successCounter = 0
    let failedCounter = 0
    let reTryCounter = 0
    let maxRetryTimes = 10
    let deferred = Q.defer()
    let filesArgs = Array.isArray(arg) ? arg : this.getFilesArgs(arg)
    let job = isRemove ? this.removeFile.bind(this) : this.putFile.bind(this)
    let start = async () => {
      if (!filesArgs[counter]) { // 任务结束
        this.listener.completed && this.listener.completed()

        return deferred.resolve({
          success: successCounter,
          failed: failedCounter
        })
      }
  
      try {
        let res = await job(filesArgs[counter])

        counter++
        successCounter++
        reTryCounter = 0 // 重置重试次数
        start()
      } catch (e) {
        if (isRemove) { // 删除如果报错，则略过
          failedCounter++
          counter++
          start()
        } else {
          reTryCounter++
          start() // 重试上传
  
          if (reTryCounter > maxRetryTimes) { // 跳过错误文件，继续上传
            counter++
            failedCounter++
            start()
          }
        }
      }
    }
  
    start()
  
    return deferred.promise
  }

  clearBucket() {

  }

  gulpTast() {
    return through2.obj((file, enc, cb) => {
      this.batchHandler(file.path)
        .then(cb)
        .catch(cb)
    })
  }
}