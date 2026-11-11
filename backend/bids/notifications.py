from django.db import transaction
from django.db.models.signals import pre_save, post_save
from django.dispatch import receiver
from accounts.request_actor import actor
from .models import Notification, Message, Job, Bid, Client, Inspector


def notify(recipient, realm, kind, object_id, title, target, version=0, new=False, conversation=None):
    if not recipient or actor.get() == (recipient, realm):
        return
    values = dict(recipient_id=recipient, realm=realm, kind=kind, objectId=object_id,
                  title=title[:300], target=target, version=version, isNew=new, conversationId=conversation)
    transaction.on_commit(lambda: Notification.objects.create(**values))


@receiver(pre_save, sender=Job)
def before_job(sender, instance, **kwargs):
    instance._previous_notification = Job.objects.filter(pk=instance.pk).values('status', 'inspector_id', 'revision').first() if instance.pk else None


@receiver(post_save, sender=Job)
def job_updated(sender, instance, created, **kwargs):
    old = getattr(instance, '_previous_notification', None)
    if not created and old and old == {'status': instance.status, 'inspector_id': instance.inspector_id, 'revision': instance.revision}:
        return
    title = {'Pending Review': 'Inspection submitted for review', 'Needs Changes': 'Changes requested',
             'Complete': 'Job completed', 'Assigned': 'New job assignment', 'Unassigned': 'Job unassigned',
             'Deleted': 'Job removed'}.get(instance.status, 'Job updated')
    if old and old['status'] == instance.status and old['inspector_id'] == instance.inspector_id:
        title = 'Job details updated'
    title += ': ' + instance.source_bid.businessName
    notify(instance.owner_id, 'admin', 'job', instance.pk, title, f'/Jobspage?jobId={instance.pk}', instance.revision, created)
    if instance.inspector_id and instance.inspector.user_id:
        notify(instance.inspector.user_id, 'inspector', 'job', instance.pk, title, f'/?jobId={instance.pk}', instance.revision,
               created or not old or old['inspector_id'] != instance.inspector_id)
    if old and old['inspector_id'] and old['inspector_id'] != instance.inspector_id:
        previous = Inspector.objects.filter(pk=old['inspector_id']).first()
        if previous:
            notify(previous.user_id, 'inspector', 'job', instance.pk, 'Job reassigned: ' + instance.source_bid.businessName, '/', instance.revision)


@receiver(post_save, sender=Message)
def message_received(sender, instance, created, **kwargs):
    if not created:
        return
    inspector = instance.inspector
    if instance.sender_id == inspector.user_id:
        notify(inspector.owner_id, 'admin', 'message', instance.pk, 'New message from ' + inspector.name,
               f'/Messaging?inspectorId={inspector.pk}', new=True, conversation=inspector.pk)
    else:
        notify(inspector.user_id, 'inspector', 'message', instance.pk, 'New message from your administrator',
               '/?tab=messages', new=True, conversation=inspector.pk)


@receiver(post_save, sender=Bid)
@receiver(post_save, sender=Client)
@receiver(post_save, sender=Inspector)
def record_updated(sender, instance, created, **kwargs):
    if sender == Bid:
        kind, label, name, target = 'bid', 'Bid', instance.businessName, f'/Bidspage?bidId={instance.pk}'
    elif sender == Client:
        kind, label, name, target = 'client', 'Client', instance.name, f'/Clientspage?clientId={instance.pk}'
    else:
        kind, label, name, target = 'inspector', 'Inspector profile', instance.name, f'/InspectorView?inspectorId={instance.pk}'
        if instance.user_id:
            notify(instance.user_id, 'inspector', 'profile', instance.pk, 'Your inspector profile was updated', '/?tab=profile', new=created)
    notify(instance.owner_id, 'admin', kind, instance.pk, f'{label} {"added" if created else "updated"}: {name}', target, new=created)
