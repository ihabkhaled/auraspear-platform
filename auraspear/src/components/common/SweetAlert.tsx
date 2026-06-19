import Swal from 'sweetalert2'
import { SweetAlertIcon } from '@/enums'
import type { InputResult, ShowOptions, ShowWithInputOptions } from '@/types'

export const SweetAlertDialog = {
  show: async (options: ShowOptions): Promise<boolean> => {
    const result = await Swal.fire({
      title: options.title,
      text: options.text,
      icon: options.icon ?? SweetAlertIcon.QUESTION,
      showCancelButton: true,
      confirmButtonText: options.confirmButtonText ?? 'Confirm',
      cancelButtonText: options.cancelButtonText ?? 'Cancel',
      customClass: {
        popup: 'bg-card text-card-foreground border border-border rounded-xl',
        confirmButton: 'bg-primary text-primary-foreground',
      },
    })

    return result.isConfirmed
  },

  showWithInput: async (options: ShowWithInputOptions): Promise<InputResult> => {
    const result = await Swal.fire({
      title: options.title,
      input: 'text',
      inputPlaceholder: options.placeholder ?? '',
      showCancelButton: true,
      confirmButtonText: options.confirmButtonText ?? 'Confirm',
      cancelButtonText: options.cancelButtonText ?? 'Cancel',
      inputValidator: value => {
        if (options.inputValidator) {
          return options.inputValidator(value)
        }
        return null
      },
      customClass: {
        popup: 'bg-card text-card-foreground border border-border rounded-xl',
        confirmButton: 'bg-primary text-primary-foreground',
        input: 'bg-background border-input',
      },
    })

    return {
      confirmed: result.isConfirmed,
      value: typeof result.value === 'string' ? result.value : '',
    }
  },
}
