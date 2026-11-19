import { request } from '../request'

/** 门店绑定码（门店出码，家长扫码绑定设备） */
export interface DeviceBindCode {
  id: string
  device_id: string
  device_name: string
  code: string
  expires_at: string
  max_uses: number
  used_count: number
  status: number
  created_at: string
}

export interface CreateBindCodeParams {
  device_id: string
  /** 最大可用次数，默认 1 */
  max_uses?: number
  /** 有效分钟数，0 或缺省表示不过期 */
  expires_in_minutes?: number
}

export interface BindCodeStatusParams {
  id: string
  /** 1-有效 0-失效 */
  status: number
}

/** 查询本租户绑定码（device_id 为空时返回全部） */
export const getBindCodes = async (params?: { device_id?: string }) => {
  return await request.get<DeviceBindCode[]>('/bind-codes', { params })
}

/** 生成绑定码 */
export const createBindCode = async (params: CreateBindCodeParams) => {
  return await request.post<DeviceBindCode>('/bind-codes', params)
}

/** 启用/失效绑定码 */
export const setBindCodeStatus = async (params: BindCodeStatusParams) => {
  return await request.put<Api.BaseApi.Data>('/bind-codes/status', params)
}
