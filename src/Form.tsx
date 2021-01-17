import { useEffect, useState } from 'react';

type UrlType = 'email' | 'telephone';

const Form = () => {
  const [urlType, setUrlType] = useState<UrlType>('email');
  const [url, setUrl] = useState<string>(
    'mailto:me@gmail.com?subject=subject&body=body'
  );
  const [error, setError] = useState(false);
  const clearError = () => setError(false);

  const isValid = (() => {
    switch (urlType) {
      case 'email':
        return isEmailUrlValid(url);
      case 'telephone':
        return isTelephoneUrlValid(url);
    }
  })();

  const validate = () => {
    setError(!isValid);
  };

  const onSave = () => {
    validate();
    if (isValid) {
      alert(`Saved url ${url}`);
    } else {
      alert(`invalid url: ${url}`);
    }
  };

  const subForm = (() => {
    switch (urlType) {
      case 'email':
        return (
          <EmailForm
            url={url}
            setUrl={setUrl}
            onSave={onSave}
            onBlur={validate}
            error={error}
            clearError={clearError}
          />
        );
      case 'telephone':
        return (
          <TelephoneForm
            url={url}
            setUrl={setUrl}
            onSave={onSave}
            onBlur={validate}
            error={error}
            clearError={clearError}
          />
        );
    }
  })();

  return (
    <div>
      <select
        value={urlType}
        onChange={event => {
          setUrlType(event.target.value as UrlType);
          setUrl('');
        }}
      >
        <option value="email" label="email" />
        <option value="telephone" label="telephone" />
      </select>
      {url}
      {subForm}
      <button onClick={onSave}>Save</button>
    </div>
  );
};

const urlFromEmailParts = ({
  email,
  subject,
  body,
}: {
  email: string;
  subject: string;
  body: string;
}) => {
  const query = { subject, body };
  const queryString = new URLSearchParams(query).toString();
  return `mailto:${email}?${queryString}`;
};

const emailPartsFromUrl = (url: string) => {
  let parsedUrl;
  try {
    parsedUrl = new URL(url);
  } catch (e) {
    console.error(e);
    return { email: '', subject: '', body: '' };
  }

  const email = parsedUrl.pathname;
  const params = parsedUrl.searchParams;
  const subject = params.get('subject') || '';
  const body = params.get('body') || '';

  return { email, subject, body };
};

const isEmailUrlValid = (url: string) => {
  const emailParts = emailPartsFromUrl(url);
  // TODO: real validation
  return emailParts.email !== '';
};

const telephoneFromUrl = (url: string) => {
  return url.replace('tel:', '');
};

const urlFromTelephone = (telephone: string) => {
  return `tel:${telephone}`;
};

const isTelephoneUrlValid = (url: string) => {
  return telephoneFromUrl(url).match(/\d+/);
};

interface SubFormProps {
  url: string;
  setUrl: (s: string) => void;
  onSave: () => void;
  onBlur: () => void;
  error: boolean;
  clearError: () => void;
}

const TelephoneForm = ({
  url,
  setUrl,
  onSave,
  onBlur,
  error,
  clearError,
}: SubFormProps) => {
  const initialTelephone = telephoneFromUrl(url);
  const [telephone, setTelephone] = useState(initialTelephone);

  return (
    <div>
      <input
        value={telephone}
        className={error ? 'error' : undefined}
        onChange={event => {
          const updatedTelephone = event.target.value;
          setTelephone(updatedTelephone);
          setUrl(urlFromTelephone(updatedTelephone));
          clearError();
        }}
        onBlur={onBlur}
        onKeyPress={event => {
          if (event.key === 'Enter') {
            onSave();
          }
        }}
      />
    </div>
  );
};

const EmailForm = ({
  url,
  setUrl,
  onSave,
  onBlur,
  error,
  clearError,
}: SubFormProps) => {
  const initialEmail = emailPartsFromUrl(url);

  const [emailParts, setEmailParts] = useState(initialEmail);

  const onChange = (dataType: 'email' | 'subject' | 'body') => (
    event:
      | React.ChangeEvent<HTMLInputElement>
      | React.ChangeEvent<HTMLTextAreaElement>
  ) => {
    const updatedEmailParts = { ...emailParts, [dataType]: event.target.value };
    setEmailParts(updatedEmailParts);
    setUrl(urlFromEmailParts(updatedEmailParts));
    clearError();
  };

  return (
    <div>
      <input
        value={emailParts.email}
        onChange={onChange('email')}
        onBlur={onBlur}
        className={error ? 'error' : undefined}
      />
      <input value={emailParts.subject} onChange={onChange('subject')} />
      <textarea value={emailParts.body} onChange={onChange('body')} />
    </div>
  );
};

export default Form;
