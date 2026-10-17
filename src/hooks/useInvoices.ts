import { useQuery } from '@tanstack/react-query'
import { getInvoice, listInvoices, verifyInvoice } from '../api/invoices'
import { isMissingEndpoint } from '../lib/demo'

/** لا نعيد المحاولة على 404 (فاتورة غير موجودة/ليست لكِ) — نعرض الحالة مباشرة */
const retry = (count: number, error: unknown) => !isMissingEndpoint(error) && (error as { response?: { status?: number } })?.response?.status !== 403 && count < 2

/** فواتير الحساب — كاش واحد لكل سنة (undefined = كل السنوات) */
export function useInvoices(year?: number) {
  return useQuery({ queryKey: ['invoices', year ?? 'all'], queryFn: () => listInvoices(year), staleTime: 60_000, retry })
}

/** الفاتورة صورة ثابتة لا تتغير إلا بإشعار دائن — كاش أطول */
export function useInvoice(invoiceNumber: string) {
  return useQuery({ queryKey: ['invoice', invoiceNumber], queryFn: () => getInvoice(invoiceNumber), enabled: Boolean(invoiceNumber), staleTime: 5 * 60_000, retry })
}

export function useInvoiceVerification(token: string) {
  return useQuery({ queryKey: ['invoice-verify', token], queryFn: () => verifyInvoice(token), enabled: Boolean(token), staleTime: 5 * 60_000, retry })
}

export const invoicePath = (invoiceNumber: string) => `/invoices/${encodeURIComponent(invoiceNumber)}`
