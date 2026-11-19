import { request } from '../request'

/** 行业方案字典（平台超管维护） */
export interface IndustrySolution {
  id: string
  code: string
  name: string
  description?: string
  schema_name: string
  icon?: string
  status: number
  sort: number
  remark?: string
}

export interface IndustrySolutionSaveParams {
  id?: string
  code: string
  name: string
  description?: string
  schema_name: string
  icon?: string
  status?: number
  sort?: number
  remark?: string
}

/** 租户信息（用于分配方案） */
export interface TenantInfo {
  tenant_id: string
  email: string
  name: string
}

/** 租户已分配方案（含方案专属运营数据概览） */
export interface TenantSolution {
  solution_code: string
  name: string
  description: string
  icon: string
  schema_name: string
  enabled: number
  device_count: number
}

export interface TenantSolutionAssignParams {
  tenant_id: string
  solution_code: string
  enabled?: number
}

/** 方案字典列表 */
export const getIndustrySolutions = async () => {
  return await request.get<IndustrySolution[]>('/solutions')
}

/** 新增/修改方案字典 */
export const saveIndustrySolution = async (params: IndustrySolutionSaveParams) => {
  return await request.post<IndustrySolution>('/solutions', params)
}

/** 删除方案字典 */
export const deleteIndustrySolution = async (id: string) => {
  return await request.delete<Api.BaseApi.Data>(`/solutions/${id}`)
}

/** 租户列表 */
export const getTenantList = async () => {
  return await request.get<TenantInfo[]>('/solutions/tenants')
}

/** 查询某租户已分配方案 */
export const getTenantSolutions = async (params: { tenant_id: string }) => {
  return await request.get<TenantSolution[]>('/solutions/assignments', { params })
}

/** 给租户分配方案（或调整启用状态） */
export const assignTenantSolution = async (params: TenantSolutionAssignParams) => {
  return await request.post<Api.BaseApi.Data>('/solutions/assignments', params)
}

/** 取消租户的方案分配 */
export const unassignTenantSolution = async (tenantId: string, code: string) => {
  return await request.delete<Api.BaseApi.Data>(`/solutions/assignments/${tenantId}/${code}`)
}
