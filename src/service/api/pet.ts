import { request } from '../request'

/** 宠物档案（后端同时返回 snake_case 与 camelCase 别名） */
export interface PetProfilePet {
  name: string
  breed: string
  age: string
  avatar: string
  boarding_days: number
}

export interface PetProfileShop {
  name: string
  open_time: string
  close_time: string
}

export interface PetProfile {
  pet: PetProfilePet
  shop: PetProfileShop
}

export interface PetDailyReport {
  eat_count: number
  sleep_minutes: number
  play_minutes: number
  drink_count: number
}

export interface PetStaffNote {
  id: string
  content: string
  staff_name: string
  create_at: string
}

export interface PetTimeline {
  id: string
  type: string
  title: string
  create_at: string
}

export interface PetAlbumItem {
  id: string
  url: string
  create_at: string
}

export interface PetRtcToken {
  app_id: string
  channel_id: string
  user_id: string
  user_name: string
  token: string
  expires_at: number
}

export interface PetSaveProfileParams {
  device_id: string
  pet_name?: string
  breed?: string
  age?: string
  avatar?: string
  boarding_days?: number
  shop_name?: string
  open_time?: string
  close_time?: string
}

export interface PetSaveStaffNoteParams {
  id?: string
  device_id: string
  content: string
  staff_name?: string
}

export interface PetSaveTimelineParams {
  device_id: string
  type?: string
  title: string
}

export interface PetSaveAlbumParams {
  device_id: string
  url: string
}

/** 宠物档案与店铺信息 */
export const getPetProfile = async (params: { device_id: string }) => {
  return await request.get<PetProfile>('/pet/profile', { params })
}

export const putPetProfile = async (params: PetSaveProfileParams) => {
  return await request.put<Api.BaseApi.Data>('/pet/profile', params)
}

/** 日报 */
export const getPetDailyReport = async (params: { device_id: string; date?: string }) => {
  return await request.get<PetDailyReport>('/pet/daily-report', { params })
}

/** 店员留言 */
export const getPetStaffNotes = async (params: { device_id: string }) => {
  return await request.get<PetStaffNote[]>('/pet/staff-notes', { params })
}

export const postPetStaffNote = async (params: PetSaveStaffNoteParams) => {
  return await request.post<PetStaffNote>('/pet/staff-note', params)
}

export const deletePetStaffNote = async (id: string) => {
  return await request.delete<Api.BaseApi.Data>(`/pet/staff-note/${id}`)
}

/** 动态时间线 */
export const getPetTimeline = async (params: { device_id: string; limit?: number }) => {
  return await request.get<PetTimeline[]>('/pet/timeline', { params })
}

export const postPetTimeline = async (params: PetSaveTimelineParams) => {
  return await request.post<PetTimeline>('/pet/timeline', params)
}

export const deletePetTimeline = async (id: string) => {
  return await request.delete<Api.BaseApi.Data>(`/pet/timeline/${id}`)
}

/** 相册 */
export const getPetAlbum = async (params: { device_id: string; limit?: number }) => {
  return await request.get<PetAlbumItem[]>('/pet/album', { params })
}

export const postPetAlbum = async (params: PetSaveAlbumParams) => {
  return await request.post<PetAlbumItem>('/pet/album', params)
}

export const deletePetAlbum = async (id: string) => {
  return await request.delete<Api.BaseApi.Data>(`/pet/album/${id}`)
}

/** 实时音视频入会凭证（调试用，AppID/AppKey 只保存在服务端） */
export const postPetRtcToken = async (params: { device_id: string }) => {
  return await request.post<PetRtcToken>('/pet/rtc/token', params)
}
