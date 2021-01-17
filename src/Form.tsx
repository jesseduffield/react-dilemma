import { useEffect, useState } from 'react';

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
    return { email: '', subject: '', body: '' };
  }

  const email = parsedUrl.pathname;
  const params = parsedUrl.searchParams;
  const subject = params.get('subject') || '';
  const body = params.get('body') || '';

  return { email, subject, body };
};

const telephoneFromUrl = (url: string) => {
  return url.replace('tel:', '');
};

const urlFromTelephone = (telephone: string) => {
  return `tel:${telephone}`;
};

interface SubFormProps {
  url: string;
  setUrl: (s: string) => void;
  onSave: () => void;
  onBlur: () => void;
  error: boolean;
  clearError: () => void;
  setValidator: (validator: (url: string) => boolean) => void;
}

const TelephoneForm = ({
  url,
  setUrl,
  onSave,
  onBlur,
  error,
  clearError,
  setValidator,
}: SubFormProps) => {
  const initialTelephone = telephoneFromUrl(url);
  const [telephone, setTelephone] = useState(initialTelephone);

  const isTelephoneUrlValid = (url: string) => {
    return !!telephoneFromUrl(url).match(/\d+/);
  };

  useEffect(() => {
    setValidator(isTelephoneUrlValid);
  }, []);

  return (
    <div>
      <input
        value={telephone}
        className={error ? 'error' : undefined}
        onChange={event => {
          const updatedTelephone = event.target.value;
          setTelephone(updatedTelephone);
          const updatedUrl = urlFromTelephone(updatedTelephone);
          setUrl(updatedUrl);
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
  onBlur,
  error,
  clearError,
  setValidator,
}: SubFormProps) => {
  const initialEmail = emailPartsFromUrl(url);
  const [emailParts, setEmailParts] = useState(initialEmail);

  const isEmailUrlValid = (url: string) => {
    const emailParts = emailPartsFromUrl(url);
    // TODO: real validation
    return emailParts.email !== '';
  };

  useEffect(() => {
    setValidator(isEmailUrlValid);
  }, []);

  const onChange = (dataType: 'email' | 'subject' | 'body') => (
    event:
      | React.ChangeEvent<HTMLInputElement>
      | React.ChangeEvent<HTMLTextAreaElement>
  ) => {
    const updatedEmailParts = { ...emailParts, [dataType]: event.target.value };
    setEmailParts(updatedEmailParts);
    const updatedUrl = urlFromEmailParts(updatedEmailParts);
    setUrl(updatedUrl);
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

interface SubForm {
  component: React.FC<SubFormProps>;
}

const subForms = {
  email: {
    component: EmailForm,
  },
  telephone: {
    component: TelephoneForm,
  },
};

type UrlType = keyof typeof subForms;

const Form = () => {
  const [urlType, setUrlType] = useState<UrlType>('email');
  const subForm = subForms[urlType];
  const [url, setUrl] = useState<string>(
    'mailto:me@gmail.com?subject=subject&body=body'
  );
  const [error, setError] = useState(false);
  const clearError = () => setError(false);
  const [validator, setValidator] = useState<null | ((url: string) => boolean)>(
    null
  );

  const isValid = validator ? validator(url) : false;
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

  const SubformComponent = subForm.component;

  return (
    <div>
      <select
        value={urlType}
        onChange={event => {
          setUrlType(event.target.value as UrlType);
          setUrl('');
        }}
      >
        {Object.keys(subForms).map(key => (
          <option key={key} value={key} label={key} />
        ))}
      </select>
      {url}
      <SubformComponent
        url={url}
        setUrl={setUrl}
        onSave={onSave}
        onBlur={validate}
        error={error}
        clearError={clearError}
        setValidator={setValidator}
      />
      <button onClick={onSave}>Save</button>
    </div>
  );
};

export default Form;
