import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'

export function CropFormFields({
  name,
  localName,
  scientificName,
}: {
  name?: string
  localName?: string | null
  scientificName?: string | null
}) {
  return (
    <>
      <Field label="Crop name">
        <Input name="name" required defaultValue={name} placeholder="Wheat" />
      </Field>
      <Field label="Local name">
        <Input name="localName" defaultValue={localName ?? ''} placeholder="गहू" />
      </Field>
      <Field label="Scientific name">
        <Input name="scientificName" defaultValue={scientificName ?? ''} placeholder="Triticum aestivum" />
      </Field>
    </>
  )
}
