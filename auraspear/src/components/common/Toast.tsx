import { toast } from 'sonner'

export const Toast = {
  success: (message: string) => toast.success(message),
  error: (message: string) => toast.error(message),
  warning: (message: string) => toast.warning(message),
  info: (message: string) => toast.info(message),
  promise: <T,>(promise: Promise<T>, opts: { loading: string; success: string; error: string }) =>
    toast.promise(promise, opts),
}
