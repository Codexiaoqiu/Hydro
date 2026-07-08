// Mirrors the shape of HomeHandler.get()'s response body after JSON.stringify.
// `*Doc.docId` matches the URL param convention: contest/detail expects ObjectId hex,
// problem-detail expects numeric docId. See individual section components.

export interface SerializedUser {
  _id: number;
  uname: string;
  avatar?: string;          // provider spec: 'gravatar:email' | 'github:user' | 'qq:num' | 'url:href' | 'file:href'
  avatarUrl?: string;       // rarely set on list users; prefer avatarUrl(udoc.avatar) from lib/avatar
  rp?: number;              // from public fields, only when FLAG_PUBLIC
  level?: number;
  bio?: string;
  displayName?: string;
  perm: string;             // 'BigInt::12345' format
}

export interface SerializedTdoc {
  _id: string;              // ObjectId hex
  docId: string;            // ObjectId hex
  title: string;
  rule: string;
  beginAt: string;          // ISO
  endAt: string;            // ISO
  penaltySince?: string;    // ISO (homework)
  lockAt?: string;          // ISO
  duration?: number;        // hours
  attend?: number;
  pids?: number[];
  dag?: Array<{ pids: number[] }>;  // training
  rated?: boolean;
  hidden?: boolean;
}

export interface SerializedPdoc {
  _id: string;              // ObjectId hex
  docId: number;            // numeric
  pid: string;
  title: string;
  tag?: string[];
  nSubmit?: number;
  nAccept?: number;
}

export interface SerializedDdoc {
  _id: string;
  docId: string;
  title: string;
  updateAt: string;         // ISO
  owner: number;
  nReply?: number;
  views?: number;
  pin?: boolean;
  highlight?: boolean;
  parentType?: number;
  parentId?: string | number;
}

export interface SerializedDomain {
  _id: string;
  bulletin?: string;        // raw markdown
  avatar?: string;
  host?: string[];
}

/** Props every section component receives from `<SectionSlot>`. */
export interface SectionProps {
  name: string;                                    // section name from the homepage config
  payload: any;                                    // backend-supplied data (shape varies per section)
  udict: Record<number, SerializedUser>;           // owner / contributor lookup table
  domain: SerializedDomain;                         // { bulletin, avatar, host, _id }
}