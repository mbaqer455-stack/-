/* ============================================================================
   بيانات الزبون + زر الحفظ

   يأخذ اسم الزبون وملاحظته، ويحفظهما مع القياسات الحالية والجنس.
   التحقق يعمل عند مغادرة الحقل (onBlur) لا عند الضغط فقط — الخطأ يظهر تحت
   الحقل نفسه، وعند الإرسال يُنقل التركيز لأول حقل خاطئ.
   ========================================================================== */

import { useRef, useState } from 'react';
import {
  api, validateSubmission,
  type FormErrors, type Gender, type MeasureKey, type Submission,
} from '../lib';
import { Button, Field, TextInput } from '../ui';

type Identity = Pick<Submission, 'fullName' | 'notes'>;

const EMPTY: Identity = { fullName: '', notes: '' };

interface Props {
  measures: Record<MeasureKey, number>;
  gender: Gender;
  onSaved: (name: string) => void;
  onError: (message: string) => void;
}

export default function CustomerForm({ measures, gender, onSaved, onError }: Props) {
  const [v, setV] = useState<Identity>(EMPTY);
  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<Partial<Record<keyof Identity, boolean>>>({});
  const [saving, setSaving] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  const full = (): Partial<Submission> => ({ ...v, ...measures, gender });

  const set = (key: keyof Identity) => (value: string) => {
    const next = { ...v, [key]: value };
    setV(next);
    // بعد أول خطأ نصحّح أثناء الكتابة حتى يرى الزبون الخطأ يختفي
    if (touched[key]) setErrors(validateSubmission({ ...full(), ...next }));
  };

  const blur = (key: keyof Identity) => () => {
    setTouched((t) => ({ ...t, [key]: true }));
    setErrors(validateSubmission(full()));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const found = validateSubmission(full());
    setErrors(found);
    setTouched({ fullName: true });

    if (Object.keys(found).length) {
      // ننقل التركيز لأول حقل خاطئ بدل عرض قائمة أخطاء في الأعلى
      formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
      return;
    }

    setSaving(true);
    try {
      await api.addSubmission({
        fullName: v.fullName.trim(),
        notes: v.notes.trim(),
        gender,
        ...measures,
      });
      onSaved(v.fullName.trim());
      setV(EMPTY);
      setErrors({});
      setTouched({});
    } catch (err) {
      onError(err instanceof Error ? err.message : 'تعذّر حفظ القياس');
    } finally {
      setSaving(false);
    }
  };

  const err = (k: keyof Identity) => (touched[k] ? errors[k] : undefined);

  return (
    <form ref={formRef} onSubmit={submit} noValidate className="card flex flex-col gap-5 p-5 sm:p-6">
      <h2 className="text-lg">بيانات الزبون</h2>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="الاسم الثلاثي" required error={err('fullName')}>
          {(id, invalid) => (
            <TextInput
              id={id} invalid={invalid} value={v.fullName}
              onChange={(e) => set('fullName')(e.target.value)}
              onBlur={blur('fullName')}
              placeholder="محمد باقر حسن" autoComplete="name"
            />
          )}
        </Field>

        <Field label="ملاحظات" hint="اختياري">
          {(id) => (
            <TextInput
              id={id} value={v.notes}
              onChange={(e) => set('notes')(e.target.value)}
              placeholder="مثلًا: أوسع قليلًا عند الكتف"
            />
          )}
        </Field>
      </div>

      <Button type="submit" size="lg" icon="check" loading={saving} className="w-full sm:w-auto sm:self-start">
        {saving ? 'جارٍ الحفظ…' : 'حفظ القياس'}
      </Button>
    </form>
  );
}
