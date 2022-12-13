{{/*
Expand the name of the chart.
*/}}
{{- define "k8s-viewer.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Create a default fully qualified app name.
We truncate at 63 chars because some Kubernetes name fields are limited to this (by the DNS naming spec).
If release name contains chart name it will be used as a full name.
*/}}
{{- define "k8s-viewer.fullname" -}}
{{- if .Values.fullnameOverride }}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- $name := default .Chart.Name .Values.nameOverride }}
{{- if contains $name .Release.Name }}
{{- .Release.Name | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- printf "%s-%s" .Release.Name $name | trunc 63 | trimSuffix "-" }}
{{- end }}
{{- end }}
{{- end }}

{{/*
Create chart name and version as used by the chart label.
*/}}
{{- define "k8s-viewer.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Common labels
*/}}
{{- define "k8s-viewer.labels" -}}
helm.sh/chart: {{ include "k8s-viewer.chart" . }}
{{ include "k8s-viewer.selectorLabels" . }}
{{- if .Chart.AppVersion }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- end }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end }}

{{/*
Selector labels
*/}}
{{- define "k8s-viewer.selectorLabels" -}}
app.kubernetes.io/instance: {{ .Release.Name }}
app.kubernetes.io/name: {{ include "k8s-viewer.name" . }}
{{- end }}

{{/*
Create the name of the service account to use
*/}}
{{- define "k8s-viewer.serviceAccountName" -}}
{{- if .Values.serviceAccount.create }}
{{- default (include "k8s-viewer.fullname" .) .Values.serviceAccount.name }}
{{- else }}
{{- default "default" .Values.serviceAccount.name }}
{{- end }}
{{- end }}

{{/*
Generate certificates
*/}}
{{- define "k8s-viewer.gen-certs" -}}
{{- $altNames := list ( printf "%s.%s.svc" "k8s-viewer" .Release.Namespace ) ( printf "%s.%s.svc.cluster.local" "k8s-viewer" .Release.Namespace ) ( printf "%s" .Values.dnsName ) -}}
{{- $ca := genCA "k8s-viewer-ca" 3650 -}}
{{- $cert := genSignedCert ( include "k8s-viewer.fullname" . ) nil $altNames 3650 $ca -}}
caCert: {{ $ca.Cert | b64enc }}
clientCert: {{ $cert.Cert | b64enc }}
clientKey: {{ $cert.Key | b64enc }}
{{- end -}}