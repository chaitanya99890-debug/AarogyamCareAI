import { Activity, CheckCircle2, HeartPulse } from 'lucide-react'
import { useState } from 'react'
import { ErrorState, Button, Card, Disclaimer, Input, PageHeader } from '../components/ui'
import { AppError } from '../services/api'
import { predictHealthRisk } from '../services/riskPredictionService'
import type { RiskPredictionRequest, RiskPredictionResponse } from '../types'

type FormValues = Record<Exclude<keyof RiskPredictionRequest, 'confirm_unusual_readings'>, string>
type FormErrors = Partial<Record<keyof RiskPredictionRequest, string>>

const initialValues: FormValues = {
  age: '', gender: '', height: '', weight: '', systolic_bp: '', diastolic_bp: '',
  cholesterol: '', glucose: '', smoking: '', alcohol: '', physical_activity: '',
}

const selectClass = 'h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-900 shadow-sm outline-none transition focus:ring-2 focus:ring-brand-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white'

function selectError(error?: string) {
  return error ? 'border-rose-400' : ''
}

function validate(values: FormValues): { errors: FormErrors; request?: RiskPredictionRequest } {
  const errors: FormErrors = {}
  const numeric = [
    ['age', 'Age', 18, 120], ['height', 'Height', 80, 250], ['weight', 'Weight', 20, 300],
    ['systolic_bp', 'Systolic blood pressure', 60, 300], ['diastolic_bp', 'Diastolic blood pressure', 30, 200],
  ] as const
  for (const [field, label, minimum, maximum] of numeric) {
    const number = Number(values[field])
    if (!values[field].trim()) errors[field] = `${label} is required.`
    else if (!Number.isFinite(number) || number < minimum || number > maximum) {
      errors[field] = `Enter a value between ${minimum} and ${maximum}.`
    }
  }
  if (values.systolic_bp && values.diastolic_bp && Number(values.systolic_bp) <= Number(values.diastolic_bp)) {
    errors.diastolic_bp = 'Diastolic pressure should be lower than systolic pressure.'
  }
  if (values.gender !== 'female' && values.gender !== 'male') errors.gender = 'Please select a gender.'
  for (const field of ['cholesterol', 'glucose'] as const) {
    if (!['1', '2', '3'].includes(values[field])) errors[field] = 'Please select a category.'
  }
  for (const field of ['smoking', 'alcohol', 'physical_activity'] as const) {
    if (!['true', 'false'].includes(values[field])) errors[field] = 'Please select Yes or No.'
  }
  if (Object.keys(errors).length > 0) return { errors }
  return {
    errors,
    request: {
      age: Number(values.age), gender: values.gender as 'female' | 'male', height: Number(values.height),
      weight: Number(values.weight), systolic_bp: Number(values.systolic_bp), diastolic_bp: Number(values.diastolic_bp),
      cholesterol: Number(values.cholesterol) as 1 | 2 | 3, glucose: Number(values.glucose) as 1 | 2 | 3,
      smoking: values.smoking === 'true', alcohol: values.alcohol === 'true', physical_activity: values.physical_activity === 'true',
    },
  }
}

function supportWarnings(values: FormValues): string[] {
  const checks = [
    ['age', 'Age', 18, 120, 'years'], ['height', 'Height', 100, 230, 'cm'],
    ['weight', 'Weight', 30, 200, 'kg'], ['systolic_bp', 'Systolic blood pressure', 70, 250, 'mmHg'],
    ['diastolic_bp', 'Diastolic blood pressure', 40, 180, 'mmHg'],
  ] as const
  return checks.flatMap(([field, label, minimum, maximum, unit]) => {
    const value = Number(values[field])
    return Number.isFinite(value) && (value < minimum || value > maximum)
      ? [`${label} (${value} ${unit}) is outside the range used to train this model (${minimum}–${maximum} ${unit}). Verify it before continuing.`]
      : []
  })
}

export function RiskPredictionPage() {
  const [values, setValues] = useState<FormValues>(initialValues)
  const [errors, setErrors] = useState<FormErrors>({})
  const [error, setError] = useState('')
  const [result, setResult] = useState<RiskPredictionResponse | null>(null)
  const [predicting, setPredicting] = useState(false)
  const [confirmedUnusualReadings, setConfirmedUnusualReadings] = useState(false)

  const update = (field: keyof FormValues, value: string) => {
    setValues((current) => ({ ...current, [field]: value }))
    setErrors((current) => ({ ...current, [field]: undefined }))
    setError('')
    setResult(null)
    setConfirmedUnusualReadings(false)
  }

  const submit = async () => {
    const validated = validate(values)
    setErrors(validated.errors)
    if (!validated.request) return
    const warnings = supportWarnings(values)
    if (warnings.length > 0 && !confirmedUnusualReadings) {
      setError('Please verify the unusual measurement(s) and confirm before requesting an estimate.')
      return
    }
    setPredicting(true)
    setError('')
    try {
      setResult(await predictHealthRisk({ ...validated.request, confirm_unusual_readings: confirmedUnusualReadings }))
    } catch (err) {
      setError(err instanceof AppError ? err.message : 'The health risk estimate could not be completed.')
    } finally {
      setPredicting(false)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Health Risk Prediction"
        description="Enter your health information for an educational ML-based cardiovascular risk estimate. It is not a medical diagnosis."
      />
      <Card>
        <div className="flex items-start gap-3">
          <HeartPulse className="mt-0.5 h-5 w-5 shrink-0 text-brand-600" aria-hidden />
          <div>
            <h2 className="font-semibold dark:text-white">Cardiovascular health inputs</h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">All measurements use years, centimetres, kilograms, and mmHg.</p>
          </div>
        </div>
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Input label="Age (years)" type="number" min="18" max="120" value={values.age} onChange={(event) => update('age', event.target.value)} error={errors.age} />
          <label className="block space-y-1.5"><span className="text-sm font-medium text-slate-700 dark:text-slate-200">Gender</span><select value={values.gender} onChange={(event) => update('gender', event.target.value)} className={`${selectClass} ${selectError(errors.gender)}`} aria-invalid={Boolean(errors.gender)}><option value="">Select gender</option><option value="female">Female</option><option value="male">Male</option></select>{errors.gender && <span className="text-xs text-rose-600">{errors.gender}</span>}</label>
          <Input label="Height (cm)" type="number" min="80" max="250" value={values.height} onChange={(event) => update('height', event.target.value)} error={errors.height} />
          <Input label="Weight (kg)" type="number" min="20" max="300" step="0.1" value={values.weight} onChange={(event) => update('weight', event.target.value)} error={errors.weight} />
          <Input label="Systolic blood pressure (mmHg)" type="number" min="60" max="300" value={values.systolic_bp} onChange={(event) => update('systolic_bp', event.target.value)} error={errors.systolic_bp} />
          <Input label="Diastolic blood pressure (mmHg)" type="number" min="30" max="200" value={values.diastolic_bp} onChange={(event) => update('diastolic_bp', event.target.value)} error={errors.diastolic_bp} />
          <RiskSelect label="Cholesterol category" value={values.cholesterol} error={errors.cholesterol} onChange={(value) => update('cholesterol', value)} options={['1|Low', '2|Normal', '3|High']} />
          <RiskSelect label="Glucose category" value={values.glucose} error={errors.glucose} onChange={(value) => update('glucose', value)} options={['1|Low', '2|Normal', '3|High']} />
          <RiskSelect label="Smoking" value={values.smoking} error={errors.smoking} onChange={(value) => update('smoking', value)} options={['false|No', 'true|Yes']} />
          <RiskSelect label="Alcohol consumption" value={values.alcohol} error={errors.alcohol} onChange={(value) => update('alcohol', value)} options={['false|No', 'true|Yes']} />
          <RiskSelect label="Physical activity" value={values.physical_activity} error={errors.physical_activity} onChange={(value) => update('physical_activity', value)} options={['false|No', 'true|Yes']} />
        </div>
        <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">Low, Normal, and High are model input categories (encoded 1, 2, and 3); they are not laboratory diagnoses or treatment guidance.</p>
        <Button className="mt-6" onClick={() => void submit()} disabled={predicting} loading={predicting}><Activity className="h-4 w-4" />Check Health Risk</Button>
        {supportWarnings(values).length > 0 && (
          <div className="mt-4 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100">
            <p className="font-semibold">Verify unusual measurement</p>
            <ul className="mt-2 list-disc space-y-1 pl-5">{supportWarnings(values).map((warning) => <li key={warning}>{warning}</li>)}</ul>
            <label className="mt-3 flex items-start gap-2"><input type="checkbox" checked={confirmedUnusualReadings} onChange={(event) => setConfirmedUnusualReadings(event.target.checked)} /><span>I have checked these values and want an educational model estimate. Measurements will not be changed.</span></label>
          </div>
        )}
      </Card>
      {error && <ErrorState message={error} onRetry={() => void submit()} />}
      {result && (
        <Card className="border-brand-200 bg-gradient-to-br from-white to-brand-50 dark:border-brand-900 dark:from-slate-900 dark:to-slate-800">
          <div className="flex items-start gap-3"><CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-brand-600" aria-hidden /><div><p className="text-sm font-medium text-brand-700 dark:text-brand-300">Model-estimated classification</p><h2 data-testid="risk-classification" className="mt-1 text-2xl font-bold dark:text-white">{result.risk_level.toUpperCase()}</h2><p className="mt-3 text-sm text-slate-600 dark:text-slate-300">Model: <strong>{result.model}</strong></p><p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Non-clinical model score for the higher-labelled class: <strong>{Math.round(result.probability * 100)}%</strong></p></div></div>
          {result.reported_input_context.length > 0 && <div className="mt-4 rounded-xl bg-slate-100 px-4 py-3 text-sm text-slate-700 dark:bg-slate-800 dark:text-slate-200"><p className="font-semibold">Reported inputs for context</p><ul className="mt-1 list-disc pl-5">{result.reported_input_context.map((item) => <li key={item}>{item}</li>)}</ul><p className="mt-2 text-xs">These are reported model inputs, not a diagnosis or a separate risk score.</p></div>}
          {result.input_warnings.length > 0 && <div className="mt-4 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:bg-amber-950/40 dark:text-amber-200"><p className="font-semibold">Input validation warning</p><ul className="mt-1 list-disc pl-5">{result.input_warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul></div>}
          <p className="mt-5 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">{result.message}</p>
        </Card>
      )}
      <Disclaimer />
    </div>
  )
}

function RiskSelect({ label, value, error, onChange, options }: { label: string; value: string; error?: string; onChange: (value: string) => void; options: string[] }) {
  return <label className="block space-y-1.5"><span className="text-sm font-medium text-slate-700 dark:text-slate-200">{label}</span><select value={value} onChange={(event) => onChange(event.target.value)} className={`${selectClass} ${selectError(error)}`} aria-invalid={Boolean(error)}><option value="">Select an option</option>{options.map((option) => { const [optionValue, optionLabel] = option.split('|'); return <option key={optionValue} value={optionValue}>{optionLabel}</option> })}</select>{error && <span className="text-xs text-rose-600">{error}</span>}</label>
}
