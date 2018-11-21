import { baseObjectParams } from './object'

export interface extMap extends baseObjectParams {}

export interface fileMap {
  objectKey: string; /**对象名 */
  file: string; /**文件路径 */
  contentType?: string; /**文件类型 */
  fileName?: string; /**文件名 */
}

export interface listenerCallback {
  removed?: Function; /**删除完成 */
  removeError?: Function; /**删除错误 */
  uploaded?: Function; /**上传完成 */
  uploadError?: Function; /**上传出错 */
  completed?: Function;  /**任务完成 */
}