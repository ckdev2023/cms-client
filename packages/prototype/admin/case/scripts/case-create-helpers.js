(function (root) {
  'use strict';

  function firstParam(params, keys) {
    for (var i = 0; i < keys.length; i += 1) {
      var value = params.get(keys[i]);
      if (value) return value;
    }
    return '';
  }

  function normalizePhone(value) {
    return String(value || '').replace(/[^0-9]/g, '');
  }

  function normalizeEmail(value) {
    return String(value || '').trim().toLowerCase();
  }

  function findDuplicateCustomers(customers, contact) {
    var phone = normalizePhone(contact && contact.phone);
    var email = normalizeEmail(contact && contact.email);
    if (!phone && !email) return [];

    return (customers || []).filter(function (customer) {
      var customerContact = String(customer.contact || '');
      var customerPhone = normalizePhone(customer.phone || customerContact);
      var customerEmail = normalizeEmail(customer.email || customerContact);
      return (phone && customerPhone && phone === customerPhone) || (email && customerEmail && email === customerEmail);
    });
  }

  function getInheritedGroup(defaultGroup, primaryCustomer) {
    return (primaryCustomer && primaryCustomer.group) || defaultGroup || '';
  }

  function shouldRequireCrossGroupReason(selectedGroup, inheritedGroup) {
    return !!selectedGroup && !!inheritedGroup && selectedGroup !== inheritedGroup;
  }

  function parseCreateContext(search, customers) {
    var params = new URLSearchParams(search || '');
    var customerId = firstParam(params, ['customerId', 'customer_id']);
    var sourceLeadId = firstParam(params, ['sourceLeadId', 'source_lead_id', 'leadId', 'lead_id']);
    var sourceLeadName = firstParam(params, ['sourceLeadName', 'source_lead_name', 'leadName', 'lead_name']);
    var customerName = firstParam(params, ['customerName', 'customer_name']);
    var customerGroup = firstParam(params, ['customerGroup', 'customer_group']);
    var customerGroupLabel = firstParam(params, ['customerGroupLabel', 'customer_group_label']);
    var entry = firstParam(params, ['entry', 'from']);
    var matchedCustomer = (customers || []).find(function (item) { return item.id === customerId; }) || null;

    return {
      entryMode: sourceLeadId || customerId || entry === 'conversion' ? 'conversion' : '',
      sourceLeadId: sourceLeadId,
      sourceLeadName: sourceLeadName,
      customerId: matchedCustomer ? matchedCustomer.id : customerId,
      customerName: (matchedCustomer && matchedCustomer.name) || customerName,
      customerGroup: (matchedCustomer && matchedCustomer.group) || customerGroup,
      customerGroupLabel: (matchedCustomer && matchedCustomer.groupLabel) || customerGroupLabel,
    };
  }

  root.CaseCreateHelpers = {
    findDuplicateCustomers: findDuplicateCustomers,
    getInheritedGroup: getInheritedGroup,
    normalizeEmail: normalizeEmail,
    normalizePhone: normalizePhone,
    parseCreateContext: parseCreateContext,
    shouldRequireCrossGroupReason: shouldRequireCrossGroupReason,
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);