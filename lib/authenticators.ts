export interface IPasswordAuthenticator {
  username: string
  password: string
}

export interface ICertificateAuthenticator {
  certificatePath: string
  keyPath: string
}

export class PasswordAuthenticator implements IPasswordAuthenticator {
  username: string
  password: string

  constructor(username: string, password: string) {
    this.username = username
    this.password = password
  }
}

export class CertificateAuthenticator implements ICertificateAuthenticator {
  certificatePath: string
  keyPath: string

  constructor(certificatePath: string, keyPath: string) {
    this.certificatePath = certificatePath
    this.keyPath = keyPath
  }
}

export type Authenticator = IPasswordAuthenticator | ICertificateAuthenticator
