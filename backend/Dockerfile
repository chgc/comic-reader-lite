# Stage 1: build
FROM golang:1.27-alpine AS builder
WORKDIR /app
COPY go.mod ./
COPY *.go ./
RUN CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o backend .

# Stage 2: minimal runtime image
FROM alpine:3.24
RUN apk add --no-cache ca-certificates && adduser -D -u 10001 app
WORKDIR /app
COPY --from=builder /app/backend .
USER app
EXPOSE 8080
CMD ["./backend"]
