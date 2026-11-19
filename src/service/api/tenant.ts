import { request } from '../request'

/** 租户角色：dealer-经销商 hospital-宠物医院 store-门店 tenant-普通租户 */
export type TenantRole = 'dealer' | 'hospital' | 'store' | 'tenant'

/** 租户层级树节点 */
export interface TenantNode {
  tenant_id: string
  parent_id: string
  name: string
  role: TenantRole | string
  children: TenantNode[]
}

export interface TenantSaveParams {
  id?: string
  parent_id?: string
  name: string
  role?: TenantRole | string
  remark?: string
}

/** 租户层级树 */
export const getTenantTree = async () => {
  return await request.get<TenantNode[]>('/tenants/tree')
}

/** 新增/修改租户层级节点 */
export const saveTenant = async (params: TenantSaveParams) => {
  return await request.post<TenantNode>('/tenants', params)
}
