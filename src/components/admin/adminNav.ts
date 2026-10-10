/**
 * 家長控制台的區塊導覽：練習中模式會把部分區塊收起來，
 * 任何地方要捲到某個區塊都呼叫 openAdminSection(id)，AdminPage 會先展開再捲過去。
 */
export const ADMIN_SECTION_EVENT = 'bhq:admin-section';

export function openAdminSection(id: string): void {
  window.dispatchEvent(new CustomEvent<string>(ADMIN_SECTION_EVENT, { detail: id }));
}
