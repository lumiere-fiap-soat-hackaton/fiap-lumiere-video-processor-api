{{- define "lumiere-video-processor.fullname" -}}
{{- printf "%s-%s" .Release.Name .Chart.Name | trunc 63 | trimSuffix "-" -}}
{{- end }}

{{- define "lumiere-video-processor.name" -}}
{{- .Chart.Name -}}
{{- end }}

{{- define "lumiere-video-processor.chart" -}}
{{- .Chart.Name }}-{{ .Chart.Version | replace "+" "_" }}
{{- end }}

{{- define "lumiere-video-processor.labels" -}}
app.kubernetes.io/name: {{ include "lumiere-video-processor.name" . }}
helm.sh/chart: {{ include "lumiere-video-processor.chart" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end }}

{{- define "lumiere-video-processor.selectorLabels" -}}
app.kubernetes.io/name: {{ include "lumiere-video-processor.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}

{{- define "lumiere-video-processor.serviceAccountName" -}}
{{- if .Values.serviceAccount.create }}
{{- default (include "lumiere-video-processor.fullname" .) .Values.serviceAccount.name }}
{{- else }}
{{- default "default" .Values.serviceAccount.name }}
{{- end }}
{{- end }}