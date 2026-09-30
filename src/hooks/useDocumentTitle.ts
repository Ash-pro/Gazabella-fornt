import { useEffect } from 'react'

const BASE_TITLE = 'Gazabella | الجمال أقرب إليك'

/** عنوان الصفحة في المتصفح وعند الحفظ/المشاركة — يُستعاد عند المغادرة */
export function useDocumentTitle(title?: string | null) {
  useEffect(() => {
    if (!title) return
    const previous = document.title
    document.title = `${title} | Gazabella`
    return () => { document.title = previous || BASE_TITLE }
  }, [title])
}
