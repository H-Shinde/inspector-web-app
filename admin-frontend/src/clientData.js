export const fields = [
    ['id', '# ID'], ['name', 'Name'], ['businessName', 'Business Name'], ['state', 'State'],
];
export const detailFields = [
    ['name', 'Name', 'text', 200],
    ['businessName', 'Business Name', 'text', 250],
    ['email', 'Email', 'email', 254],
    ['phone', 'Phone', 'tel', 50],
    ['fax', 'Fax', 'tel', 50],
    ['streetAddress', 'Street Address', 'text', 300],
    ['city', 'City', 'text', 150],
    ['state', 'State', 'text', 2],
    ['zipCode', 'ZIP', 'text', 10],
];
export const newClient = () => Object.fromEntries(detailFields.map(([field]) => [field, '']));
