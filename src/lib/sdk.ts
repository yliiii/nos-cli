import {
  extMap,
  fileMap,
  listenerCallback
} from '../types/sdk'

import { NosClient } from '@xgheaven/nos-node-sdk'
import Q from 'q'
import { baseObjectParams } from '../types/object'
import crypto from 'crypto'
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
   * @param map
   */
  protected setMd5Key(map: fileMap): fileMap {
    let buffer = fs.readFileSync(map.file)
    let fsHash = crypto.createHash('md5')

    fsHash.update(buffer)

    let md5Map = { ...map }
    let md5Str = fsHash.digest('hex')
    let name = map.objectKey.split('.')

    if (name.length > 1) {
      name[name.length - 1] = md5Str + '.' + name[name.length - 1]
      md5Map.objectKey = name.join('.')
    } else {
      md5Map.objectKey += '.' + md5Str
    }

    return md5Map
  }

  /**
   *
   * @param filePath
   * @param rootPath 
   */
  getFilesArgs(params: baseObjectParams = { filePath: '', rootPath: '', md5: false }) {
    let files: Array<fileMap> = []
    let { filePath, rootPath, md5 } = params
    let fileState = fs.lstatSync(resolve(filePath))
    let handleFile = (fileName: string, isFromDir: boolean = false): void | fileMap => {
      if (FILE_IGNORE.indexOf(fileName) > -1) return

        let ext = fileName.split('.')
        let pathPrefix = this.nosEnvPath || rootPath || ''

        pathPrefix && (pathPrefix += '/')

        return {
          fileName,
          objectKey: `${pathPrefix || ''}${fileName}`,
          file: isFromDir ? resolve(filePath, fileName) : resolve(filePath),
          contentType: this.getContentType(ext.length > 1 ? ext[ext.length - 1] : ext[0])
        }
    }

    if (fileState.isDirectory()) {
      fs.readdirSync(filePath).forEach(fileName => {
        const stat = fs.lstatSync(resolve(filePath, fileName))

        if (stat.isDirectory()) {
          files = files.concat(this.getFilesArgs({
            filePath: resolve(filePath, fileName),
            rootPath: rootPath ? `${rootPath}/${fileName}` : fileName,
            md5
          }))
        } else {
          const map = handleFile(fileName, true)
          map && files.push(md5 ? this.setMd5Key(map) : map)
        }
      })
    } else {
      let fileName = filePath.split('/')
      let map = handleFile(fileName[fileName.length - 1])
      map && files.push(md5 ? this.setMd5Key(map) : map)
    }

    return files
  }

  /**
   * 
   * @param path
   */
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
      this.listener.removed && this.listener.removed({ objectKey })
      deferred.resolve({ objectKey })
    }).catch(err => {
      this.listener.removeError && this.listener.removeError(err)
      deferred.reject(err)
    })

    return deferred.promise
  }

  /**
   *
   * @param args [string|array] 支持传入path，或者已经格式化好的fileMap
   * @param isRemove [boolean]
   */
  batchHandler(args: Array<fileMap> | baseObjectParams, isRemove?: boolean): Q.Promise<any> {
    let counter = 0
    let successCounter = 0
    let failedCounter = 0
    let reTryCounter = 0
    let maxRetryTimes = 10
    let deferred = Q.defer()
    let filesArgs = Array.isArray(args) ? args : this.getFilesArgs(args)
    let job = isRemove ? this.removeFile.bind(this) : this.putFile.bind(this)
    let start = async () => {
      if (!filesArgs[counter]) { // 任务结束
        let result = {
          success: successCounter,
          failed: failedCounter
        }

        this.listener.completed && this.listener.completed(result)

        return deferred.resolve(result)
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

  gulpTast(param = { md5: false }) {
    const { md5 } = param
    return through2.obj((file, enc, cb) => {
      this.batchHandler({
        filePath: file.path,
        md5
      })
        .then(() => cb())
        .catch(err => cb(err))
    })
  }
}