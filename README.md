# The use case

We want to create a component that lets the user create a url of any kind with an intuitive interface. For now we support two url kinds: telephone and mailto. Telephone urls look like `tel:0411223341` and mailto's look like `mailto:me@gmail.com?subject=my%20subject&body=my%20body`.

We want to have a select which lets the user choose which kind of url they want to construct, and then we want the appropriate input(s) to appear to enable them to construct the URL. In the case of a telephone url, we would just have the user enter a number into an input and upon hitting save we would prepend `tel:` to the value. With a mailto url, we'll have three inputs, one for the email address, one for the subject and finally one for the body. Upon save we would combine those values to create the mailto url.

# The problem

Upon pressing the save button in the parent component, we need to know whether the resultant url is valid, based on the value of the input(s) in the child component. For example, if we're constructing a telephone url and it contains an alphabetical character, we would refuse to save the url.

## Solution 1: Two switch statements

```tsx
type UrlType = 'email' | 'telephone';

const Form = () => {
  const [urlType, setUrlType] = useState<UrlType>('telephone');
  const [url, setUrl] = useState<string>('');
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
  ...
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
```

One way to enable this behaviour is to have all the validation code live in the parent component, and have a switch statement on the url type (e.g. telephone/email/etc) which will determine how to validate the url. We would then also have a switch statement on the url type determining which child component we should render

Pros:
- Allows us to support unforseen new use cases easily because we're not locked into an abstraction (see solution 2 below)

Cons:
- Two switch statements is a code smell that we could be using polymorphism instead
- Validation logic is not properly paired with rendering logic
- parent component is quite bloated
- Supporting a new url type requires updating both switch statements as well as the permitted type for our `url` state variable.  A developer could easily forget to do one of these things leading to bugs.

## Solution 2: Polymorphism with validation outside child components

This isn't really polymorphism as you would find in OO programming but it's close enough. The idea is to have a SubForm interface like so:

```tsx
interface SubForm {
  isValid: (url: string) => boolean;
  component: React.FC<SubFormProps>;
}

const subForms = {
  email: {
    isValid: isEmailUrlValid,
    component: EmailForm,
  },
  telephone: {
    isValid: isTelephoneUrlValid,
    component: TelephoneForm,
  },
};

type UrlType = keyof typeof subForms;

const Form = () => {
  const [urlType, setUrlType] = useState<UrlType>('email');
  const subForm = subForms[urlType];
  const SubformComponent = subForm.component;
  const isValid = subForm.isValid(url);

  ...
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
      />
      <button onClick={onSave}>Save</button>
    </div>
  );
```
With this approach, supporting a new url type is as simple as creating a new component, a new validator function, and adding to our subForms array.
Pros:
- no more switch statements
- easy to extend
- validation and rendering is now explicitly paired via SubForm interface

Cons:
- validation is purely a function of our resultant url and only returns true/false: but we may want specific validation errors to appear on a per-input basis in our SubformComponents (e.g. the email address value is malformed in our EmailForm). If we have our validation functions return information that's only relevant to the corresponding SubformComponent, it begs the question of why we don't just have the validation handled inside the SubformComponent itself

## Solution 3: Polymorphism with validation inside child components

With this approach, we move our isValid functions inside the child components themselves so the parent no longer needs to worry about how specifically to validate a url. This makes for better cohesion, but means we need to do some extra work to tell the parent component whether the url is valid upon clicking the save button.

Now our SubForm interface just contains the component:
```tsx
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
```
And our `isTelephoneUrlValid` function can be moved inside our TelephoneForm component:
```tsx
const TelephoneForm = ({
  url,
  setUrl,
  onSave,
  onBlur,
  error,
  clearError,
  setIsValid,
}: SubFormProps) => {
  const initialTelephone = telephoneFromUrl(url);
  const [telephone, setTelephone] = useState(initialTelephone);

  const isTelephoneUrlValid = (url: string) => {
    return !!telephoneFromUrl(url).match(/\d+/);
  };

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
          setIsValid(isTelephoneUrlValid(updatedUrl));
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
```
As mentioned above, it's not sufficient for the TelephoneForm component to know that the resultant url is invalid: the parent must also know the validity so that when the save button is clicked, it can decide whether or not to actually save the url. So now instead of having a regular isValid variable whose value is determined on each render based on the url value in the parent component, we're using useState to manage our isValid/setIsValid variables, and in each input's onChange callback we tell the parent whether the new value is valid by calling `setIsValid`.

Pros:
- child components can determine validity however they want, whether by looking at the resultant url, or by looking at the individual input(s).
- better cohesion: no need to pair up validation logic with render logic (i.e. the component) in the SubForm interface because the validation already lives inside the component.

Cons:
- More state to manage in the parent component. More state variables means more chance of impossible states being represented. For example, perhaps the url becomes valid but due to some bug the isValid variable gets stuck on a false value.
- `setIsValid(false)` will need to be called whenever we select a new url type in the parent component, so that we don't carry over the validation state of the previous url type. Alternatively we can use useEffect for this inside our child components, but there's no way of enforcing that at the type level.

## Solution 4: Have child components register validators

This is similar to solution 3, except that instead of an `isValid` state variable living in the parent, it's now a `validator` state variable, and each time a SubFormComponent mounts, it calls `setValidator` with its own validator e.g. `setValidator(isTelephoneUrlValid)`. We would  use `useLayoutEffect` to achieve this so that we aren't using the last url type's validator upon the initial render of the child component.

```tsx
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
  ...
```

Pros:
- isValid value will never get out of sync with url because it can be determined on the fly with our validator

Cons:
- validator functions can only take the url rather than the individual inputs
- no way to enforce child components to register validators with types
- harder to grok what's going on as a reader
- Same issue as solution 3 in that bugs may arise when e.g. we're building an email url but for some reason the telephone validator is set.

## Discussion

Solutions 2 and 3 seem the most appropriate to me. S2 is slightly less cohesive than S3 in that you need to specify both a component and a validator as part of the SubForm interface whereas in S3 it's just a matter of specifying the component. S3 allows the developer to choose between validating the inputs themselves and validating the resultant url. Given that with our current use cases there is a one-to-one mapping from url to inputs, this isn't a big deal, but I can imagine situations where it's not 1:1 and you really need the values of the inputs themselves which the parent can't access (and if you moved those values up to the parent it would get bloated). But S2 is more deterministic and doesn't have any risks of our isValid state variable getting stale.

I'm currently leaning towards S3. Each commit in this repo represents one of these solutions.
